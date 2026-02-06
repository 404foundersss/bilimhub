const API_URL = 'https://bilimhub-backend.onrender.com/api';
const tg = window.Telegram.WebApp;
tg.expand();

let currentTeacherId = null;

// --- 1. ЛОГИКА ONBOARDING ---
function checkOnboarding() {
    if (localStorage.getItem('bilimhub_onboarding_done')) {
        document.getElementById('onboarding').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        loadTeachers();
    } else {
        document.getElementById('slide1').classList.add('active');
    }
}

function nextSlide(n) {
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    document.getElementById(`slide${n}`).classList.add('active');
}

function closeOnboarding() {
    localStorage.setItem('bilimhub_onboarding_done', 'true');
    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadTeachers();
}

// --- 2. ЗАГРУЗКА УЧИТЕЛЕЙ ---
async function loadTeachers(subject = 'Все') {
    const grid = document.getElementById('teachers-grid');
    grid.innerHTML = '<div style="text-align:center; padding:20px;">Ищем лучших наставников...</div>';

    try {
        const res = await fetch(`${API_URL}/teachers?subject=${subject}`);
        const teachers = await res.json();
        grid.innerHTML = teachers.map(t => `
            <div class="card" onclick="openBooking(${t.id}, '${t.name}')">
                <div class="avatar-container">
                    <img src="${t.image}" class="avatar">
                    <div class="status-dot ${t.is_online ? '' : 'status-offline'}"></div>
                </div>
                <div class="info">
                    <div class="name">${t.name}</div>
                    <div class="subject">${t.subject} • ${t.experience} лет опыта</div>
                    <div class="price"><span>${t.price} ₸/час</span> <span>★ ${t.rating}</span></div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = '<div style="color:red;">Сервер не отвечает. Попробуй позже.</div>';
    }
}

function filterTeachers(subject, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadTeachers(subject);
}

// --- 3. УМНЫЙ ЧАТ ---
function toggleChat() {
    const modal = document.getElementById('chat-modal');
    modal.classList.toggle('open');
    
    const chatBody = document.getElementById('chat-messages');
    if (modal.classList.contains('open') && chatBody.children.length <= 1) {
        const greets = [
            "Салем! Я твой наставник BilimHub. Что сегодня изучим? 🎓",
            "Привет! Ты ученик в поиске знаний или учитель, готовый делиться опытом? ✨",
            "«Дорога в тысячу миль начинается с первого шага». Помочь найти учителя? 🚀"
        ];
        appendMessage('bot', greets[Math.floor(Math.random() * greets.length)]);
    }
}

function appendMessage(role, text) {
    const chatBody = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.innerText = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
}

async function sendMessage() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    input.value = '';
    const typing = appendMessage('bot', '...');

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        typing.innerText = data.reply;
    } catch (err) {
        typing.innerText = "Ошибка связи. Проверь, запущен ли сервер.";
    }
}

document.getElementById('ai-input').addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

// --- 4. БРОНИРОВАНИЕ ---
function openBooking(id, name) {
    currentTeacherId = id;
    document.getElementById('booking-teacher-name').innerText = `Запись к: ${name}`;
    document.getElementById('booking-modal').style.display = 'flex';
}

function closeBooking() { document.getElementById('booking-modal').style.display = 'none'; }

async function submitBooking() {
    const contact = document.getElementById('user-phone').value;
    const name = document.getElementById('user-name-input').value;
    if (!contact) return alert("Введите телефон!");

    try {
        await fetch(`${API_URL}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacher_id: currentTeacherId, user_name: name, contact: contact })
        });
        alert("Заявка отправлена!");
        closeBooking();
    } catch (err) { alert("Ошибка отправки."); }
}


checkOnboarding();
