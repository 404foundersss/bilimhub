require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// 1. НАСТРОЙКА БАЗЫ ДАННЫХ (NEON)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// 2. НАСТРОЙКА AI (OPENAI)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 3. НАСТРОЙКА TELEGRAM БОТА
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

// --- API ЭНДПОИНТЫ ---

// Получение списка учителей
app.get('/api/teachers', async (req, res) => {
    try {
        const { subject } = req.query;
        let query = 'SELECT * FROM teachers';
        let params = [];

        if (subject && subject !== 'Все') {
            query += ' WHERE subject = $1';
            params.push(subject);
        }
        
        query += ' ORDER BY is_online DESC, rating DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка БД:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// AI Чат-ассистент "BilimHub Mentor"
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Контекст для ИИ: список учителей из базы
        const teachersData = await pool.query('SELECT name, subject, price FROM teachers LIMIT 10');
        const teachersList = teachersData.rows.map(t => `${t.name} (${t.subject}, ${t.price}тг)`).join(', ');

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { 
                    role: "system", 
                    content: `Ты  BilimHub Mentor, вдохновляющий ИИ-наставник. 
                    ТВОЙ СТИЛЬ: Энергичный, дружелюбный, используешь эмодзи 🚀.
                    
                    ТВОИ ЗАДАЧИ:
                    1. ДЛЯ УЧЕНИКОВ: Помогай найти учителей из списка: ${teachersList}. Мотивируй их, используй мудрость Абая или цитаты о силе знаний. 
                    2. ДЛЯ УЧИТЕЛЕЙ: Если пишет учитель, давай советы по методике преподавания и вовлечению студентов.
                    
                    ПРАВИЛА: Отвечай кратко (до 3-4 предложений). В каждом ответе старайся добавить капельку мотивации. Заканчивай ответ вопросом.` 
                },
                { role: "user", content: message }
            ],
            temperature: 0.85 // Больше "жизни" в ответах
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (err) {
        console.error('Ошибка AI:', err);
        res.json({ reply: "Трудности — это путь к мудрости! 💪 Я скоро вернусь в строй." });
    }
});

// Создание заявки
app.post('/api/requests', async (req, res) => {
    try {
        const { teacher_id, user_name, contact } = req.body;
        const result = await pool.query(
            'INSERT INTO requests (teacher_id, user_name, contact) VALUES ($1, $2, $3) RETURNING id',
            [teacher_id, user_name, contact]
        );

        const teacherResult = await pool.query('SELECT name FROM teachers WHERE id = $1', [teacher_id]);
        const teacherName = teacherResult.rows[0]?.name || 'Учитель';

        const msg = `🚀 *Новая заявка!*\n\n👤 Имя: ${user_name}\n📞 Контакт: ${contact}\n👨‍🏫 К кому: ${teacherName}`;
        await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown' });

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка заявки:', err);
        res.status(500).json({ success: false });
    }
});

// Запуск
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер BilimHub на порту ${PORT}`);
    bot.launch().catch(err => console.error('Ошибка бота:', err.description));
});