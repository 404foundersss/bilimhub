const API_URL = 'https://bilimhub-backend.onrender.com/api';
const tg = window.Telegram.WebApp;

// Настройка Telegram WebApp
tg.expand();
tg.enableClosingConfirmation();
// Устанавливаем цвета хедера под тему Telegram
tg.setHeaderColor(tg.themeParams.bg_color || '#ffffff'); 
tg.setBackgroundColor(tg.themeParams.bg_color || '#ffffff');

// --- STATE MANAGEMENT (Состояние приложения) ---
const state = {
    tutors: [],       // Все загруженные репетиторы
    filter: 'all',    // Текущий фильтр предмета
    search: '',       // Текущий поисковый запрос
    sortBy: 'rating', // Текущая сортировка
    priceMax: 10000,  // Фильтр цены
    view: 'grid',     // Вид: сетка или список
    currentTutor: null // Выбранный репетитор для записи
};

// --- DOM ELEMENTS ---
const elements = {
    grid: document.getElementById('tutorsGrid'),
    skeleton: document.getElementById('skeletonGrid'),
    noResults: document.getElementById('noResults'),
    filterPills: document.getElementById('filterPills'),
    searchInput: document.getElementById('searchInput'),
    tutorCount: document.getElementById('tutorCount'),
    toastContainer: document.getElementById('toastContainer')
};

// --- 1. INITIALIZATION & ONBOARDING ---

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    checkOnboarding();
    setupEventListeners();
    
    // Загружаем данные сразу
    fetchTutors();

    // Если есть AI кнопка в HTML
    const aiInput = document.getElementById('aiInput');
    if(aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAiMessage();
        });
    }
}

function checkOnboarding() {
    const isDone = localStorage.getItem('bilimhub_onboarding_done');
    const onboarding = document.getElementById('onboarding');
    
    if (isDone) {
        if (onboarding) onboarding.style.display = 'none';
    } else {
        // Логика слайдера
        setupOnboardingSlider();
    }
}

function setupOnboardingSlider() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.getElementById('onboardingNext');
    const skipBtn = document.getElementById('onboardingSkip');

    function showSlide(n) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[n].classList.add('active');
        dots[n].classList.add('active');
        
        // Вибрация
        tg.HapticFeedback.selectionChanged();
        
        if (n === slides.length - 1) {
            nextBtn.querySelector('.btn-text').innerText = 'Начать';
        } else {
            nextBtn.querySelector('.btn-text').innerText = 'Далее';
        }
    }

    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            showSlide(currentSlide);
        } else {
            completeOnboarding();
        }
    });

    skipBtn.addEventListener('click', completeOnboarding);
    
    // Клик по точкам
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });
}

function completeOnboarding() {
    tg.HapticFeedback.notificationOccurred('success');
    localStorage.setItem('bilimhub_onboarding_done', 'true');
    const onboarding = document.getElementById('onboarding');
    onboarding.style.opacity = '0';
    setTimeout(() => onboarding.remove(), 500);
}

// --- 2. DATA FETCHING & LOGIC ---

async function fetchTutors() {
    // Показываем скелетон
    elements.skeleton.style.display = 'grid';
    elements.grid.style.display = 'none';
    elements.noResults.style.display = 'none';

    try {
        // В реальном проекте убрать mock и раскомментировать fetch
        // const res = await fetch(`${API_URL}/teachers`);
        // if (!res.ok) throw new Error('Network error');
        // state.tutors = await res.json();
        
        // --- MOCK DATA (ДЛЯ ТЕСТА, ПОКА НЕТ БЭКЕНДА) ---
        // Удалить этот блок, когда подключишь реальный API
        await new Promise(r => setTimeout(r, 1500)); // Имитация задержки
        state.tutors = [
            { id: 1, name: 'Алина Смаилова', subject: 'Математика', price: 4500, rating: 4.9, experience: 5, image: 'https://randomuser.me/api/portraits/women/44.jpg', is_online: true },
            { id: 2, name: 'Кайрат Нуртас', subject: 'Физика', price: 6000, rating: 5.0, experience: 10, image: 'https://randomuser.me/api/portraits/men/32.jpg', is_online: false },
            { id: 3, name: 'Elena Gilbert', subject: 'Английский', price: 3500, rating: 4.7, experience: 3, image: 'https://randomuser.me/api/portraits/women/68.jpg', is_online: true },
            { id: 4, name: 'Дмитрий Петров', subject: 'Химия', price: 5000, rating: 4.8, experience: 7, image: 'https://randomuser.me/api/portraits/men/85.jpg', is_online: true },
        ];
        // ------------------------------------------------

        applyFilters(); // Применяем фильтры и рендерим
    } catch (err) {
        console.error(err);
        showToast('Ошибка загрузки данных', 'error');
    } finally {
        elements.skeleton.style.display = 'none';
        elements.grid.style.display = 'grid';
    }
}

// --- 3. FILTERING & RENDERING (CORE) ---

function applyFilters() {
    let result = state.tutors.filter(t => {
        // 1. Фильтр по предмету
        const subjectMatch = state.filter === 'all' || t.subject.includes(state.filter);
        // 2. Поиск по имени или предмету
        const searchMatch = t.name.toLowerCase().includes(state.search) || 
                          t.subject.toLowerCase().includes(state.search);
        // 3. Фильтр по цене
        const priceMatch = t.price <= state.priceMax;

        return subjectMatch && searchMatch && priceMatch;
    });

    // Сортировка
    if (state.sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    if (state.sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    if (state.sortBy === 'rating') result.sort((a, b) => b.rating - a.rating);
    
    // Обновляем счетчик
    if(elements.tutorCount) {
        elements.tutorCount.innerText = result.length;
    }

    renderGrid(result);
}

function renderGrid(data) {
    elements.grid.innerHTML = '';

    if (data.length === 0) {
        elements.noResults.style.display = 'flex';
        return;
    }

    elements.noResults.style.display = 'none';

    // Создаем HTML с помощью DocumentFragment (быстрее)
    const fragment = document.createDocumentFragment();

    data.forEach(t => {
        const card = document.createElement('div');
        card.className = 'tutor-card glass';
        card.onclick = () => openBookingModal(t);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="avatar-wrapper">
                    <img src="${t.image}" alt="${t.name}" loading="lazy">
                    <div class="status-indicator ${t.is_online ? 'online' : 'offline'}"></div>
                </div>
                <div class="card-badges">
                    <span class="badge-rating">⭐ ${t.rating}</span>
                </div>
            </div>
            <div class="card-body">
                <h3 class="tutor-name">${t.name}</h3>
                <p class="tutor-subject">${t.subject}</p>
                <div class="tutor-meta">
                    <span>🎓 ${t.experience} лет опыта</span>
                </div>
                <div class="tutor-footer">
                    <div class="price-tag">
                        <span class="price-amount">${t.price.toLocaleString()} ₸</span>
                        <span class="price-period">/час</span>
                    </div>
                    <button class="btn-book-mini">Записаться</button>
                </div>
            </div>
        `;
        fragment.appendChild(card);
    });

    elements.grid.appendChild(fragment);
}

// --- 4. EVENT LISTENERS SETUP ---

function setupEventListeners() {
    // 1. Фильтр Пиллсы (Chips)
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            // UI
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            // Logic
            state.filter = pill.dataset.filter;
            tg.HapticFeedback.selectionChanged();
            applyFilters();
        });
    });

    // 2. Поиск с Debounce
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.search = e.target.value.toLowerCase();
            applyFilters();
        }, 300); // Ждем 300мс после ввода
    });
    
    // Кнопка очистки поиска
    const clearBtn = document.getElementById('searchClear');
    elements.searchInput.addEventListener('input', (e) => {
        clearBtn.style.display = e.target.value ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.search = '';
        clearBtn.style.display = 'none';
        applyFilters();
    });

    // 3. Сортировка и Фильтры
    const sortBy = document.getElementById('sortBy');
    if(sortBy) {
        sortBy.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            applyFilters();
        });
    }

    const priceRange = document.getElementById('priceRange');
    const priceDisplay = document.getElementById('priceDisplay');
    if(priceRange) {
        priceRange.addEventListener('input', (e) => {
            state.priceMax = parseInt(e.target.value);
            priceDisplay.innerText = `до ${state.priceMax}₸`;
            document.getElementById('rangeFill').style.width = 
                ((state.priceMax - 3000) / (10000 - 3000)) * 100 + '%';
            applyFilters();
        });
    }

    // 4. Тоггл фильтров
    const filtersToggle = document.getElementById('filtersToggle');
    const filtersPanel = document.getElementById('filtersPanel');
    if(filtersToggle) {
        filtersToggle.addEventListener('click', () => {
            filtersPanel.classList.toggle('active');
            filtersToggle.classList.toggle('active');
            tg.HapticFeedback.impactOccurred('light');
        });
    }

    // 5. Модальные окна (закрытие)
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', () => {
            const modal = el.closest('.modal');
            closeModal(modal.id);
        });
    });

    // 6. AI кнопка
    document.getElementById('aiBtn').addEventListener('click', () => {
        openModal('aiModal');
        tg.HapticFeedback.impactOccurred('medium');
    });
}

// --- 5. BOOKING LOGIC (TELEGRAM NATIVE) ---

function openBookingModal(tutor) {
    state.currentTutor = tutor;
    const modal = document.getElementById('tutorModal');
    const body = document.getElementById('tutorModalBody');

    // Генерируем красивую форму
    body.innerHTML = `
        <div class="tutor-profile-header">
            <img src="${tutor.image}" class="profile-avatar">
            <div>
                <h3>${tutor.name}</h3>
                <p>${tutor.subject} • ⭐ ${tutor.rating}</p>
            </div>
        </div>
        <div class="booking-inputs">
            <label class="form-label">Ваше имя</label>
            <input type="text" id="bookingName" class="form-input" 
                value="${tg.initDataUnsafe?.user?.first_name || ''}" placeholder="Введите имя">
            
            <label class="form-label" style="margin-top:15px">Телефон</label>
            <input type="tel" id="bookingPhone" class="form-input" placeholder="+7 (7__) ___-__-__">
        </div>
        <div class="info-note">
            ℹ️ Репетитор получит уведомление и свяжется с вами в Telegram или WhatsApp.
        </div>
    `;

    openModal('tutorModal');

    // НАСТРОЙКА NATIVE BUTTON TELEGRAM
    tg.MainButton.setText(`ЗАПИСАТЬСЯ ЗА ${tutor.price}₸`);
    tg.MainButton.show();
    tg.MainButton.onClick(submitBooking); // Привязываем функцию
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = ''; // Разблокируем скролл
    
    // Если закрываем окно репетитора - скрываем главную кнопку
    if (modalId === 'tutorModal') {
        tg.MainButton.hide();
        tg.MainButton.offClick(submitBooking); // Отвязываем событие, чтобы не дублировалось
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden'; // Блокируем скролл фона
}

async function submitBooking() {
    const name = document.getElementById('bookingName').value;
    const phone = document.getElementById('bookingPhone').value;

    if (!name || !phone || phone.length < 10) {
        tg.HapticFeedback.notificationOccurred('error');
        showToast('Пожалуйста, заполните имя и телефон', 'error');
        // Трясем инпуты
        document.getElementById('bookingPhone').classList.add('shake');
        setTimeout(() => document.getElementById('bookingPhone').classList.remove('shake'), 500);
        return;
    }

    // Анимация загрузки на кнопке
    tg.MainButton.showProgress();

    try {
        const payload = {
            teacher_id: state.currentTutor.id,
            user_name: name,
            contact: phone,
            tg_id: tg.initDataUnsafe?.user?.id
        };

        const res = await fetch(`${API_URL}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // if (!res.ok) throw new Error('Error');

        // Успех!
        tg.MainButton.hideProgress();
        tg.HapticFeedback.notificationOccurred('success');
        
        closeModal('tutorModal');
        triggerConfetti(); // САЛЮТ!
        showToast('Заявка успешно отправлена! 🚀', 'success');

    } catch (err) {
        tg.MainButton.hideProgress();
        tg.HapticFeedback.notificationOccurred('error');
        showToast('Ошибка сервера. Попробуйте позже.', 'error');
    }
}

// --- 6. UI UTILITIES ---

// Toast Notifications (Красивые уведомления)
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Удаление через 3 сек
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confetti Effect
function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// --- 7. AI CHAT LOGIC ---

async function sendAiMessage() {
    const input = document.getElementById('aiInput');
    const chat = document.getElementById('aiChat');
    const text = input.value.trim();
    
    if(!text) return;

    // User Message
    addChatMessage('user', text);
    input.value = '';
    tg.HapticFeedback.selectionChanged();

    // Loading Bubble
    const loadingId = 'loading-' + Date.now();
    const loadingHtml = `<div class="ai-message assistant" id="${loadingId}"><div class="message-content">...</div></div>`;
    chat.insertAdjacentHTML('beforeend', loadingHtml);
    chat.scrollTop = chat.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        
        document.getElementById(loadingId).remove();
        addChatMessage('assistant', data.reply);
        
    } catch(e) {
        document.getElementById(loadingId).remove();
        addChatMessage('assistant', 'Прости, я сейчас отдыхаю. Попробуй позже.');
    }
}

function addChatMessage(role, text) {
    const chat = document.getElementById('aiChat');
    const div = document.createElement('div');
    div.className = `ai-message ${role}`;
    div.innerHTML = `
        <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content"><div class="message-text">${text}</div></div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

