document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();

    const login = document.getElementById('login').value.trim();
    const password = document.getElementById('password').value;

    if (!login || !password) {
        showMsg('Введите логин и пароль', 'error');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            showMsg(data.error || 'Ошибка входа', 'error');
            return;
        }
        saveSession(data.user, data.role);
        window.location.href = data.role === 'admin' ? '/admin.html' : '/applications.html';
    } catch (err) {
        showMsg('Сервер недоступен', 'error');
    }
});
