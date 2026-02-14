
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

// Build avatar element: tries real photo from UI Avatars (professional style), fallback to initials
function buildAvatarHTML(name) {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

    const bg = encodeURIComponent(getAvatarGradient(name).replace(/[^#0-9a-fA-F,\s]/g, ''));

    // Use UI Avatars service — generates a real clean avatar with initials, looks professional
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
        const res = await fetch(`${API_URL}/teachers?subject=${subject}`);
        const teachers = await res.json();

        if (teachers.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
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
            const starsCount = Math.round(parseFloat(t.rating) || 5);
            const starsFilled = '★'.repeat(Math.min(starsCount, 5));

            return `
                <div class="card" onclick="openBooking(${t.id}, '${t.name}')" style="animation-delay: ${index * 0.06}s">
                    <div class="card-banner"></div>
                    <div class="card-body">
                        ${buildAvatarHTML(t.name)}
                        <div class="info">
                            <div class="name">${t.name}</div>
                            <div class="subject-tag">
                                <span>${subjectIcon}</span>
                                <span>${t.subject}</span>
                            </div>
                            <div class="experience-row">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                                </svg>
                                <span>${t.experience} лет опыта</span>
                            </div>
                            <div class="price">
                                <span class="price-value">${t.price} ₸/час</span>
                                <div class="rating-badge">
                                    <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                    ${t.rating}
                                </div>
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
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                    Ошибка загрузки
                </div>
                <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px;">
                    Не удалось загрузить список наставников
                </div>
                <button onclick="loadTeachers('Все')" style="padding: 12px 24px; background: var(--accent-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Попробовать снова
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

// === CHAT ===
function toggleChat() {
    const modal = document.getElementById('chat-modal');
    modal.classList.toggle('open');

    if (modal.classList.contains('open')) {
        setTimeout(() => {
            document.getElementById('ai-input').focus();
        }, 300);
    }
}

function appendMessage(role, text) {
    const chatBody = document.getElementById('chat-messages');

    const welcome = chatBody.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.textContent = text;
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
        typing.textContent = data.reply || 'Извините, не смог обработать ваш запрос.';
    } catch (error) {
        console.error('Chat error:', error);
        typing.textContent = 'Ошибка связи с сервером. Попробуйте позже.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('ai-input');
    if (input) {
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendMessage();
        });
    }
});

// === REGISTER TEACHER ===
function openRegisterTeacher() {
    document.getElementById('register-teacher-modal').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('teacher-first-name').focus();
    }, 100);
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
        alert('Пожалуйста, введите имя');
        document.getElementById('teacher-first-name').focus();
        return;
    }
    if (!lastName) {
        alert('Пожалуйста, введите фамилию');
        document.getElementById('teacher-last-name').focus();
        return;
    }
    if (!subject) {
        alert('Пожалуйста, выберите предмет');
        document.getElementById('teacher-subject').focus();
        return;
    }
    if (!phone) {
        alert('Пожалуйста, введите номер телефона');
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
            btn.style.background = 'linear-gradient(135deg, #2D6A4F, #40916C)';

            setTimeout(() => {
                closeRegisterTeacher();
                showNotification(`Анкета отправлена! Мы свяжемся с вами, ${firstName}.`, 'success');
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 1500);
        } else {
            throw new Error('Request failed');
        }
    } catch (error) {
        console.error('Register error:', error);
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        showNotification('Ошибка отправки анкеты. Попробуйте позже.', 'error');
    }
}

// === BOOKING ===
function openBooking(id, name) {
    currentTeacherId = id;
    document.getElementById('booking-teacher-name').textContent = `Запись к: ${name}`;
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

// === CLOSE MODALS ON ESCAPE ===
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const chatModal = document.getElementById('chat-modal');
        const bookingModal = document.getElementById('booking-modal');

        if (chatModal.classList.contains('open')) toggleChat();
        if (bookingModal.style.display === 'flex') closeBooking();
        const registerModal = document.getElementById('register-teacher-modal');
        if (registerModal.style.display === 'flex') closeRegisterTeacher();
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
});

