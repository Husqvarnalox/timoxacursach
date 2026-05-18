function showMsg(text, type) {
    const el = document.getElementById('msg');
    if (!el) return;
    el.textContent = text;
    el.className = 'msg visible ' + (type || 'error');
}

function clearMsg() {
    const el = document.getElementById('msg');
    if (el) el.className = 'msg';
}

function saveSession(user, role) {
    localStorage.setItem('korochki_user', JSON.stringify(user));
    localStorage.setItem('korochki_role', role);
}

function getSession() {
    const raw = localStorage.getItem('korochki_user');
    if (!raw) return null;
    return { user: JSON.parse(raw), role: localStorage.getItem('korochki_role') };
}

function clearSession() {
    localStorage.removeItem('korochki_user');
    localStorage.removeItem('korochki_role');
}

function requireUser() {
    const s = getSession();
    if (!s || s.role !== 'user') {
        window.location.href = '/';
        return null;
    }
    return s;
}

function requireAdmin() {
    const s = getSession();
    if (!s || s.role !== 'admin') {
        window.location.href = '/';
        return null;
    }
    return s;
}

function setupHeader(session) {
    const name = document.getElementById('user-name');
    if (name && session) name.textContent = session.user.full_name;
    const logout = document.getElementById('logout');
    if (logout) {
        logout.addEventListener('click', (e) => {
            e.preventDefault();
            clearSession();
            window.location.href = '/';
        });
    }
}

function formatDate(s) {
    if (!s) return '';
    const d = new Date(s);
    return d.toLocaleDateString('ru-RU');
}

function paymentLabel(p) {
    return p === 'cash' ? 'Наличными' : (p === 'phone_transfer' ? 'Перевод' : p);
}

function statusBadge(s) {
    let cls = 'status-new';
    if (s === 'Идет обучение') cls = 'status-in';
    else if (s === 'Обучение завершено') cls = 'status-done';
    return `<span class="status-badge ${cls}">${s}</span>`;
}
