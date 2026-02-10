const API_URL = 'https://bilimhub-backend.onrender.com/api'; 
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
let state = {
    allTutors: [],
    currentFilter: 'all',
    searchQuery: ''
};

// --- 1. ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ---
document.addEventListener('DOMContentLoaded', () => {
    // Скрываем загрузочный экран через 2 секунды (имитация или до загрузки данных)
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
        
        checkOnboarding();
    }, 2000);

    initEventListeners();
});

// Проверка онбординга
function checkOnboarding() {
    if (localStorage.getItem('bilimhub_done')) {
        document.getElementById('onboarding').style.display = 'none';
        loadTeachers();
    } else {
        initOnboardingLogic();
    }
}

function initOnboardingLogic() {
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('onboardingNext');
    let currentSlide = 0;

    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');
            currentSlide++;
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
            
            if (currentSlide === slides.length - 1) {
                nextBtn.querySelector('.btn-text').innerText = 'Начать';
            }
        } else {
            finishOnboarding();
        }
    });

    document.getElementById('onboardingSkip').onclick = finishOnboarding;
}

function finishOnboarding() {
    localStorage.setItem('bilimhub_done', 'true');
    document.getElementById('onboarding').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('onboarding').style.display = 'none';
        loadTeachers();
    }, 500);
}

// --- 2. РАБОТА С API И ГРИДОМ ---
async function loadTeachers() {
    const grid = document.getElementById('tutorsGrid');
    const skeleton = document.getElementById('skeletonGrid');
    
    try {
        const res = await fetch(`${API_URL}/teachers`);
        if (!res.ok) throw new Error('Ошибка сети');
        
        state.allTutors = await res.json();
        renderTutors(state.allTutors);
        
    } catch (err) {
        console.error("Ошибка загрузки:", err);
        grid.innerHTML = `<div class="no-results" style="display:block;">
            <h3>Ошибка связи с сервером</h3>
            <p>Убедитесь, что бэкенд на Render проснулся.</p>
        </div>`;
    } finally {
        if (skeleton) skeleton.style.display = 'none';
    }
}

function renderTutors(tutors) {
    const grid = document.getElementById('tutorsGrid');
    const noResults = document.getElementById('noResults');
    
    if (tutors.length === 0) {
        grid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    grid.style.display = 'grid';
    
    grid.innerHTML = tutors.map(t => `
        <div class="card glass animate-in" onclick="openTutorDetails(${t.id})">
            <div class="card-badge">${t.subject}</div>
            <div class="avatar-container">
                <img src="${t.image || 'https://via.placeholder.com/150'}" class="avatar" alt="${t.name}">
                <div class="status-dot ${t.is_online ? 'online' : 'offline'}"></div>
            </div>
            <div class="info">
                <div class="name">${t.name}</div>
                <div class="experience">Опыт: ${t.experience || 0} лет</div>
                <div class="price-row">
                    <span class="price">${t.price} ₸/час</span>
                    <span class="rating">⭐ ${t.rating || '5.0'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- 3. ФИЛЬТРЫ И ПОИСК ---
function initEventListeners() {
    // Поиск
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        filterAndRender();
    });

    // Фильтры (пилюли)
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.currentFilter = pill.getAttribute('data-filter');
            filterAndRender();
        });
    });

    // AI Модалка
    const aiBtn = document.getElementById('aiBtn');
    const aiModal = document.getElementById('aiModal');
    const closeAi = document.getElementById('closeAiModal');

    aiBtn.onclick = () => aiModal.classList.add('active');
    closeAi.onclick = () => aiModal.classList.remove('active');
}

function filterAndRender() {
    let filtered = state.allTutors;

    if (state.currentFilter !== 'all') {
        filtered = filtered.filter(t => t.subject === state.currentFilter);
    }

    if (state.searchQuery) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(state.searchQuery) || 
            t.subject.toLowerCase().includes(state.searchQuery)
        );
    }

    renderTutors(filtered);
}

// --- 4. УМНЫЙ ЧАТ ---
const aiInput = document.getElementById('aiInput');
const aiSend = document.getElementById('aiSend');
const aiChat = document.getElementById('aiChat');

async function sendAiMessage() {
    const text = aiInput.value.trim();
    if (!text) return;

    appendMsg('user', text);
    aiInput.value = '';

    const loadingMsg = appendMsg('assistant', 'Думаю...');

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        loadingMsg.querySelector('.message-text').innerText = data.reply;
    } catch (err) {
        loadingMsg.querySelector('.message-text').innerText = "Ой, мозг перегрелся. Проверь сервер!";
    }
}

function appendMsg(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${role}`;
    msgDiv.innerHTML = `
        <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content">
            <div class="message-text">${text}</div>
        </div>
    `;
    aiChat.appendChild(msgDiv);
    aiChat.scrollTop = aiChat.scrollHeight;
    return msgDiv;
}

aiSend.onclick = sendAiMessage;
aiInput.onkeypress = (e) => { if(e.key === 'Enter') sendAiMessage(); };

// --- 5. ДЕТАЛИ РЕПЕТИТОРА (МОДАЛКА) ---
function openTutorDetails(id) {
    const tutor = state.allTutors.find(t => t.id === id);
    if (!tutor) return;

    const modal = document.getElementById('tutorModal');
    const body = document.getElementById('tutorModalBody');

    body.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <img src="${tutor.image}" style="width:120px; height:120px; border-radius:50%; object-fit:cover;">
            <h2>${tutor.name}</h2>
            <p>${tutor.subject}</p>
            <div style="margin: 20px 0; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 12px;">
                ${tutor.description || 'Превосходный преподаватель с индивидуальным подходом.'}
            </div>
            <button class="reg-submit-btn" onclick="tg.openTelegramLink('https://t.me/твой_аккаунт_менеджера')">
                Связаться в Telegram
            </button>
        </div>
    `;
    modal.classList.add('active');
}

document.getElementById('closeTutorModal').onclick = () => {
    document.getElementById('tutorModal').classList.remove('active');
};
