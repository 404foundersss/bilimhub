const API_URL = 'https://bilimhub-backend.onrender.com/api';
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('onboardingDone')) {
        showMainApp();
    }
});
function nextSlide(num) {
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
    
    document.getElementById(`slide${num}`).classList.add('active');
    document.querySelectorAll('.dot')[num-1].classList.add('active');
}

function finishOnboarding() {
    localStorage.setItem('onboardingDone', 'true');
   showMainApp();
}

function showMainApp() {
    document.getElementById('onboarding').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    loadTeachers();
}

// Загрузка учителей из Neon
async function loadTeachers(subject = 'Все') {
    const grid = document.getElementById('tutorsGrid');
    grid.innerHTML = '<p>Загрузка...</p>';

    try {
        let url = `${API_URL}/teachers`;
        if (subject !== 'Все') url += `?subject=${encodeURIComponent(subject)}`;

        const res = await fetch(url);
        const data = await res.json();
        grid.innerHTML = data.map(t => `
            <div class="card">
                <img src="${t.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+t.id}" class="tutor-img">
                <div class="tutor-name">${t.name}</div>
                <div class="tutor-subj">${t.subject}</div>
                <div style="font-weight:bold; margin-top:8px;">${t.price} ₸</div>
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = '<p>Ошибка базы данных</p>';
    }
}

function filterBy(subject, btn) {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    loadTeachers(subject);
}

// AI Функционал
function openAI() { document.getElementById('aiModal').classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

async function sendMsg() {
    const input = document.getElementById('aiInput');
    const box = document.getElementById('chatBox');
    if(!input.value) return;

    box.innerHTML += `<p><b>Вы:</b> ${input.value}</p>`;
    const text = input.value;
    input.value = '';

    const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    box.innerHTML += `<p style="color:var(--accent)"><b>AI:</b> ${data.reply}</p>`;
    box.scrollTop = box.scrollHeight;
}

