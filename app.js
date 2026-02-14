// === BILIMHUB PREMIUM APP ===

const API_URL = 'https://bilimhub-backend.onrender.com/api';
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
    'информатика': '💻',
    'it': '💻',
    'литература': '📖',
    'literature': '📖',
    'биология': '🌿',
    'biology': '🌿',
    'география': '🌍',
    'geography': '🌍',
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
function buildAvatarHTML(name) {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

    const bg = encodeURIComponent(getAvatarGradient(name).replace(/[^#0-9a-fA-F,\s]/g, ''));

    // Use UI Avatars service
    const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=144&background=1B4332&color=fff&font-size=0.4&bold=true&rounded=true&format=svg`;

    return `
        <div class="avatar-wrap">
            <img 
                class="avatar-img" 
                src="${photoUrl}"
                alt="${name}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="avatar-fallback" style="display:none; background: ${getAvatarGradient(name)}">${initials}</div>
            <div class="avatar-badge"></div>
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
    // НЕ скрываем онбординг! Всегда показываем при загрузке
    initializeApp();
});

// === ONBOARDING - ИСПРАВЛЕНО ===
function initializeApp() {
    const onboarding = document.getElementById('onboarding');
    const app = document.getElementById('app');

    // ВСЕГДА показываем онбординг
    if (onboarding) onboarding.style.display = 'flex';
    if (app) app.style.display = 'none';
}

function closeOnboarding() {
    const onboarding = document.getElementById('onboarding');
    const app = document.getElementById('app');

    if (onboarding) onboarding.style.display = 'none';
    if (app) app.style.display = 'block';

    loadTeachers();
}

// Кнопка "показать онбординг снова" в header (опционально)
function showOnboardingAgain() {
    const onboarding = document.getElementById('onboarding');
    const app = document.getElementById('app');

    if (onboarding) onboarding.style.display = 'flex';
    if (app) app.style.display = 'none';
}

// === TEACHERS ===
async function loadTeachers(subject = 'Все') {
    const grid = document.getElementById('teachers-grid');
    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🎓</div>
            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
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
                        ${buildAvatarHTML(t.name)}
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
                    API: <strong>${API_URL}</strong>
                </div>
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
                    Ошибка: ${error.message}
                </div>
                <button onclick="loadTeachers('Все')" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #0F8B8D, #117A79);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">
                    ↻ Попробовать снова
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
        showNotification('Пожалуйста, введите ваше имя', 'error');
        document.getElementById('user-name-input').focus();
        return;
    }
    
    if (!contact) {
        showNotification('Пожалуйста, введите номер телефона', 'error');
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

    if (!firstName || !lastName || !subject || !phone) {
        showNotification('Пожалуйста, заполните все поля', 'error');
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
                showNotification(`Спасибо, ${firstName}! Мы получили вашу анкету.`, 'success');
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 1500);
        }
    } catch (error) {
        console.error('Register error:', error);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        showNotification('Ошибка при отправке', 'error');
    }
}

// === AI CHAT ===
function toggleChat() {
    document.getElementById('chat-modal').classList.toggle('open');
    if (document.getElementById('chat-modal').classList.contains('open')) {
        setTimeout(() => document.getElementById('ai-input').focus(), 100);
    }
}

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
        
        if (response.ok) {
            const data = await response.json();
            typing.textContent = data.reply || 'Извините, не смог обработать ваш запрос.';
        }
    } catch (error) {
        typing.textContent = '❌ Ошибка подключения к ИИ';
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

// === NOTIFICATIONS ===
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 24px;
        background: ${type === 'success' ? '#2D6A4F' : type === 'error' ? '#DC2626' : '#0F8B8D'};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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

// === CLOSE MODALS ===
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('chat-modal')?.classList.remove('open');
        if (document.getElementById('booking-modal').style.display === 'flex') closeBooking();
        if (document.getElementById('register-teacher-modal').style.display === 'flex') closeRegisterTeacher();
    }
});

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

    const chatInput = document.getElementById('ai-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});
