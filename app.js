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
app.get('/api/teachers', async(req, res) => {
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
app.post('/api/chat', async(req, res) => {
    try {
        const { message } = req.body;

        // Контекст для ИИ: список учителей из базы
        const teachersData = await pool.query('SELECT name, subject, price FROM teachers LIMIT 10');
        const teachersList = teachersData.rows.map(t => `${t.name} (${t.subject}, ${t.price}тг)`).join(', ');

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{
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
app.post('/api/requests', async(req, res) => {
    try {
        const { teacher_id, user_name, contact } = req.body;

        if (!teacher_id || !user_name || !contact) {
            return res.status(400).json({ success: false, error: 'Все поля обязательны' });
        }

        const result = await pool.query(
            'INSERT INTO requests (teacher_id, user_name, contact) VALUES ($1, $2, $3) RETURNING id', [teacher_id, user_name, contact]
        );

        const teacherResult = await pool.query('SELECT name FROM teachers WHERE id = $1', [teacher_id]);
        const teacherName = (teacherResult.rows[0] && teacherResult.rows[0].name) || 'Учитель';

        const msg = `🚀 *Новая заявка на занятие!*\n\n👤 Имя: ${user_name}\n📞 Контакт: ${contact}\n👨‍🏫 К кому: ${teacherName}`;
        try {
            await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown' });
        } catch (botErr) {
            console.error('Ошибка отправки сообщения в Telegram:', botErr);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка заявки:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Форма связи с преподавателями
app.post('/api/contact', async(req, res) => {
            try {
                const { name, email, phone, subject, message } = req.body;

                if (!name || !email || !subject || !message) {
                    return res.status(400).json({ success: false, error: 'Требуемые поля отсутствуют' });
                }

                // Сохранение в БД (если есть таблица contacts)
                try {
                    await pool.query(
                        'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES ($1, $2, $3, $4, $5)', [name, email, phone || null, subject, message]
                    );
                } catch (dbErr) {
                    console.warn('Не удалось сохранить в БД:', dbErr.message);
                }

                // Отправка в Telegram
                const msgText = `📧 *Новое сообщение от преподавателей!*\n\n👤 Имя: ${name}\n📧 Email: ${email}\n${phone ? `📞 Телефон: ${phone}\n` : ''}📚 Предмет: ${subject}\n\n💬 Сообщение:\n${message}`;
        try {
            await bot.telegram.sendMessage(ADMIN_ID, msgText, { parse_mode: 'Markdown' });
        } catch (botErr) {
            console.error('Ошибка отправки в Telegram:', botErr);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка обработки формы:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Регистрация преподавателей
app.post('/api/register-teacher', async (req, res) => {
    try {
        const { first_name, last_name, subject, phone } = req.body;
        
        if (!first_name || !last_name || !subject || !phone) {
            return res.status(400).json({ success: false, error: 'Все поля обязательны' });
        }

        const fullName = `${first_name} ${last_name}`;

        // Сохранение в БД (если есть таблица teacher_applications)
        try {
            await pool.query(
                'INSERT INTO teacher_applications (name, subject, phone) VALUES ($1, $2, $3)',
                [fullName, subject, phone]
            );
        } catch (dbErr) {
            console.warn('Не удалось сохранить в БД:', dbErr.message);
        }

        // Отправка в Telegram
        const msgText = `👨‍🏫 *Новая заявка от преподавателя!*\n\n👤 ФИО: ${fullName}\n📚 Предмет: ${subject}\n📞 Телефон: ${phone}`;
        try {
            await bot.telegram.sendMessage(ADMIN_ID, msgText, { parse_mode: 'Markdown' });
        } catch (botErr) {
            console.error('Ошибка отправки в Telegram:', botErr);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка регистрации преподавателя:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'BilimHub сервер работает!' });
});

// Статическая папка (если нужна)
app.use(express.static('.'));

// Запуск
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер BilimHub на порту ${PORT}`);
    bot.launch().catch(err => console.error('Ошибка бота:', err.description));
});
