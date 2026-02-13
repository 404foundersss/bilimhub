// === BILIMHUB PREMIUM APP - СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ===

// Конфигурация API - АВТОМАТИЧЕСКИЙ ВЫБОР СЕРВЕРА
const getAPIURL = () => {
    // Если на localhost - используем localhost:3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    // На продакшене используем тот же хост как фронтенд
    const protocol = window.location.protocol; // http: или https:
    const host = window.location.host; // example.com:port или example.com
    return `${protocol}//${host}/api`;
};

const API_URL = getAPIURL();

console.log('🔗 API URL:', API_URL); // Для отладки

const tg = window.Telegram && window.Telegram.WebApp;
if (tg) tg.expand();

let currentTeacherId = null;

// Subject icons mapping
const SUBJECT_ICONS = {
    'математика': '📐',
    'math': '📐',
    'английский': '🌐',
    'english': '🌐',
    'физика': '⚛️',
    'physics': '⚛️',
    'химия': '🧪',
    'chemistry': '🧪',
    'история': '📜',
    'history': '📜',
    'география': '🌍',
    'geography': '🌍',
    'биология': '🌿',
    'biology': '🌿',
    'информатика': '💻',
    'it': '💻',
    'литература': '📖',
    'literature': '📖',
};

function getSubjectIcon(subject) {
    if (!subject) return '📚';
    const key = subject.toLowerCase();
    for (const [k, v] of Object.entries(SUBJECT_ICONS)) {
        if (key.includes(k)) return v;
    }
    return '📚';
}

// Generate a deterministic pastel gradient based on name
function getAvatarGradient(name) {
    const gradients = [
        'linear-gradient(135deg, #1B4332, #40916C)',
        'linear-gradient(135deg, #0A1628, #2C4365)',
        'linear-gradient(135deg, #1A2B47, #2D6A4F)',
        'linear-gradient(135deg, #155E63, #0E7490)',
        'linear-gradient(135deg, #312E81, #1B4332)',
        'linear-gradient(135deg, #7C2D12, #1B4332)',
        'linear-gradient(135deg, #134E4A, #0A1628)',
        'linear-gradient(135deg, #1E3A5F, #40916C)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
}

// Build avatar element
function buildAvatarHTML(name, isOnline = false) {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

    return `
        <div class="avatar-wrap">
            <div class="avatar-fallback" style="background: ${getAvatarGradient(name)}">${initials}</div>
            ${isOnline ? '<div class="avatar-badge online"></div>' : '<div class="avatar-badge"></div>'}
        </div>
    `;
}

// === THEME TOGGLE ===
function toggleTheme() {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("bilimhub_theme", isDark ? "dark" : "light");
}

// === INITIALIZATION ===
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("bilimhub_theme") === "dark") {
        document.body.classList.add("dark");
    }
    checkOnboarding();
});

// === ONBOARDING ===
function checkOnboarding() {
    if (localStorage.getItem('bilimhub_onboarding_done')) {
        document.getElementById('onboarding').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        loadTeachers();
    } else {
        document.getElementById('onboarding').style.display = 'flex';
    }
}

function closeOnboarding() {
    localStorage.setItem('bilimhub_onboarding_done', 'true');
    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadTeachers();
}

// === TEACHERS - ЗАГРУЗКА ИЗ API ===
async function loadTeachers(subject = 'Все') {
    const grid = document.getElementById('teachers-grid');
    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <div class="loading-spinner"></div>
            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-top: 24px; margin-bottom: 8px;">
                Загружаем лучших наставников...
            </div>
            <div style="font-size: 14px; color: var(--text-muted);">
                Подбираем экспертов специально для вас
            </div>
        </div>
    `;

    try {
        const queryParam = subject === 'Все' ? '' : `?subject=${encodeURIComponent(subject)}`;
        const response = await fetch(`${API_URL}/teachers${queryParam}`);

        if (!response.ok) {
            throw new Error('Failed to fetch teachers');
        }

        const teachers = await response.json();

        if (teachers.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">🔍</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                        Наставники не найдены
                    </div>
                    <div style="font-size: 14px; color: var(--text-muted);">
                        Попробуйте выбрать другой предмет
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = teachers.map((t, index) => {
                    const subjectIcon = getSubjectIcon(t.subject);
                    const isOnline = t.is_online || false;

                    return `
                <div class="card" onclick="openBooking(${t.id}, '${t.name.replace(/'/g, "\\'")}', '${t.subject}')" style="animation-delay: ${index * 0.06}s">
                    <div class="card-banner">
                        ${isOnline ? '<div class="online-indicator"><span class="pulse"></span><span class="text">В сети</span></div>' : ''}
                    </div>
                    <div class="card-body">
                        ${buildAvatarHTML(t.name, isOnline)}
                        <div class="info">
                            <div class="name">${t.name}</div>
                            <div class="subject-tag">
                                <span>${subjectIcon}</span>
                                <span>${t.subject}</span>
                            </div>
                            ${t.experience ? `
                                <div class="experience-row">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                                    </svg>
                                    <span>${t.experience} лет опыта</span>
                                </div>
                            ` : ''}
                            <div class="price">
                                <span class="price-value">${t.price} ₸/час</span>
                                ${t.rating ? `
                                    <div class="rating-badge">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                        ${t.rating}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading teachers:', error);
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                    Не удалось подключиться к серверу
                </div>
                <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 12px;">
                    Убедитесь, что сервер запущен на: <strong>${API_URL}</strong>
                </div>
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
                    Ошибка: ${error.message}
                </div>
                <button onclick="loadTeachers('Все')" class="btn-retry">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                    </svg>
                    <span>Попробовать снова</span>
                </button>
            </div>
        `;
    }
}

function filterTeachers(subject, btn) {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadTeachers(subject);
}

// === AI CHAT ===
let chatMessages = [];

function toggleChat() {
    const modal = document.getElementById('chat-modal');
    const isOpen = modal.classList.toggle('open');
    
    if (isOpen && chatMessages.length === 0) {
        addMessage('bot', 'Добро пожаловать в BilimHub! 🚀 Я ваш ИИ-наставник. Чем могу помочь?');
    }
}

function addMessage(type, text) {
    const container = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'bot' ? '🤖' : '👤';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);
    
    container.scrollTop = container.scrollHeight;
    chatMessages.push({ type, text });
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addMessage('user', message);
    input.value = '';
    
    // Показываем индикатор набора
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message bot typing-indicator';
    typingIndicator.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-bubble">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    document.getElementById('chat-messages').appendChild(typingIndicator);
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        typingIndicator.remove();
        
        if (response.ok) {
            const data = await response.json();
            addMessage('bot', data.reply);
        } else {
            throw new Error('Chat request failed');
        }
    } catch (error) {
        console.error('Chat error:', error);
        typingIndicator.remove();
        addMessage('bot', 'Извините, возникла ошибка. Попробуйте еще раз! 💪');
    }
}

// Enter для отправки сообщения
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});

// === REGISTER TEACHER ===
function openRegisterTeacher() {
    document.getElementById('register-teacher-modal').style.display = 'flex';
}

function closeRegisterTeacher() {
    document.getElementById('register-teacher-modal').style.display = 'none';
    document.getElementById('teacher-first-name').value = '';
    document.getElementById('teacher-last-name').value = '';
    document.getElementById('teacher-subject').value = '';
    document.getElementById('teacher-phone').value = '';
}

async function submitRegisterTeacher() {
    const firstName = document.getElementById('teacher-first-name').value.trim();
    const lastName = document.getElementById('teacher-last-name').value.trim();
    const subject = document.getElementById('teacher-subject').value;
    const phone = document.getElementById('teacher-phone').value.trim();

    if (!firstName) {
        showNotification('Пожалуйста, введите имя', 'error');
        document.getElementById('teacher-first-name').focus();
        return;
    }
    if (!lastName) {
        showNotification('Пожалуйста, введите фамилию', 'error');
        document.getElementById('teacher-last-name').focus();
        return;
    }
    if (!subject) {
        showNotification('Пожалуйста, выберите предмет', 'error');
        document.getElementById('teacher-subject').focus();
        return;
    }
    if (!phone) {
        showNotification('Пожалуйста, введите номер телефона', 'error');
        document.getElementById('teacher-phone').focus();
        return;
    }

    const btn = document.querySelector('#register-teacher-modal .btn-submit');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Отправка...</span>';

    try {
        const response = await fetch(`${API_URL}/register-teacher`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                subject: subject,
                phone: phone
            })
        });

        if (response.ok) {
            btn.innerHTML = '<span>✓ Отправлено!</span>';
            btn.style.background = 'linear-gradient(135deg, #0F8B8D, #117A79)';

            setTimeout(() => {
                closeRegisterTeacher();
                showNotification(`Спасибо, ${firstName}! Мы получили вашу анкету и свяжемся с вами в ближайшее время.`, 'success');
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                // Очистить форму
                document.getElementById('teacher-first-name').value = '';
                document.getElementById('teacher-last-name').value = '';
                document.getElementById('teacher-subject').value = '';
                document.getElementById('teacher-phone').value = '';
            }, 1500);
        } else {
            throw new Error('Failed to register');
        }
    } catch (error) {
        console.error('Register teacher error:', error);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        showNotification(`Ошибка: ${error.message}`, 'error');
    }
}

// === BOOKING ===
function openBooking(id, name, subject) {
    currentTeacherId = id;
    const subjectIcon = getSubjectIcon(subject);
    document.getElementById('booking-teacher-name').innerHTML = `
        <span style="font-size: 24px; margin-right: 8px;">${subjectIcon}</span>
        Запись к: ${name}
    `;
    document.getElementById('booking-modal').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('user-name-input').focus();
    }, 100);
}

function closeBooking() {
    document.getElementById('booking-modal').style.display = 'none';
    document.getElementById('user-name-input').value = '';
    document.getElementById('user-phone').value = '';
}

async function submitBooking() {
    const name = document.getElementById('user-name-input').value.trim();
    const contact = document.getElementById('user-phone').value.trim();
    
    if (!name) {
        alert("Пожалуйста, введите ваше имя");
        document.getElementById('user-name-input').focus();
        return;
    }
    
    if (!contact) {
        alert("Пожалуйста, введите номер телефона");
        document.getElementById('user-phone').focus();
        return;
    }

    const btn = document.querySelector('#booking-modal .btn-submit');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Отправка...</span>';

    try {
        const response = await fetch(`${API_URL}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                teacher_id: currentTeacherId, 
                user_name: name, 
                contact: contact
            })
        });

        if (response.ok) {
            btn.innerHTML = '<span>✓ Отправлено!</span>';
            btn.style.background = 'linear-gradient(135deg, #2D6A4F, #40916C)';
            
            setTimeout(() => {
                closeBooking();
                showNotification('Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.', 'success');
                btn.disabled = false;
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 1500);
        } else {
            throw new Error('Request failed');
        }
    } catch (error) {
        console.error('Booking error:', error);
        btn.disabled = false;
        btn.innerHTML = originalText;
        showNotification('Ошибка отправки заявки. Попробуйте позже.', 'error');
    }
}

// === NOTIFICATIONS ===
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: ${type === 'success' ? 'linear-gradient(135deg, #2D6A4F, #40916C)' : 'linear-gradient(135deg, #dc2626, #ef4444)'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 600;
        font-size: 15px;
        max-width: 90%;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: 'Urbanist', sans-serif;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(-100px)';
        setTimeout(() => {
            if (document.body.contains(notification)) document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// === CHAT MESSAGE - ОТПРАВКА В AI ===
async function sendMessage() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    appendMessage('user', text);
    input.value = '';

    const typing = appendMessage('bot', '⏳ Печатаю...');

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        typing.textContent = data.reply || 'Извините, не смог обработать ваш запрос.';
    } catch (error) {
        console.error('Chat error:', error);
        typing.textContent = `❌ Ошибка: ${error.message || 'Не удалось подключиться к серверу'}`;
    }
}

function appendMessage(role, text) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv;
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('ai-input');
    if (input) {
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// === CONTACT FORM - ОТПРАВКА СООБЩЕНИЯ ПРЕПОДАВАТЕЛЯМ ===
async function submitContactForm(event) {
    event.preventDefault();

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value.trim();

    if (!name) {
        showNotification('Пожалуйста, введите ваше имя', 'error');
        document.getElementById('contact-name').focus();
        return;
    }

    if (!email) {
        showNotification('Пожалуйста, введите email', 'error');
        document.getElementById('contact-email').focus();
        return;
    }

    if (!subject) {
        showNotification('Пожалуйста, выберите предмет', 'error');
        document.getElementById('contact-subject').focus();
        return;
    }

    if (!message) {
        showNotification('Пожалуйста, напишите сообщение', 'error');
        document.getElementById('contact-message').focus();
        return;
    }

    const btn = document.querySelector('#contact-teachers-form .btn-submit');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>Отправка...</span>';

    try {
        const response = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                email, 
                phone, 
                subject, 
                message 
            })
        });
        
        if (response.ok) {
            btn.innerHTML = '<span>✓ Сообщение отправлено!</span>';
            btn.style.background = 'linear-gradient(135deg, #0F8B8D, #117A79)';

            setTimeout(() => {
                showNotification(`Спасибо, ${name}! Мы получили ваше сообщение и свяжемся с вами в ближайшее время.`, 'success');
                document.getElementById('contact-teachers-form').reset();
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 1500);
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        console.error('Contact form error:', error);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        showNotification(`Ошибка отправки: ${error.message}`, 'error');
    }
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const chatModal = document.getElementById('chat-modal');
        const bookingModal = document.getElementById('booking-modal');
        const registerModal = document.getElementById('register-teacher-modal');
        
        if (chatModal && chatModal.classList.contains('open')) toggleChat();
        if (bookingModal && bookingModal.style.display === 'flex') closeBooking();
        if (registerModal && registerModal.style.display === 'flex') closeRegisterTeacher();
    }
});

// === CLOSE MODALS ON BACKDROP CLICK ===
document.addEventListener('DOMContentLoaded', () => {
    const bookingModal = document.getElementById('booking-modal');
    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) closeBooking();
        });
    }
    
    const registerModal = document.getElementById('register-teacher-modal');
    if (registerModal) {
        registerModal.addEventListener('click', (e) => {
            if (e.target === registerModal) closeRegisterTeacher();
        });
    }
});
