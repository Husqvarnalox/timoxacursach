const reLogin = /^[a-zA-Z0-9]{6,}$/;
const rePhone = /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/;
const reFio = /^[а-яА-ЯёЁ\s]+$/;
const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();

    const login = document.getElementById('login').value.trim();
    const password = document.getElementById('password').value;
    const full_name = document.getElementById('full_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!reLogin.test(login))   return showMsg('Логин: латиница и цифры, минимум 6 символов', 'error');
    if (password.length < 8)    return showMsg('Пароль: минимум 8 символов', 'error');
    if (!reFio.test(full_name)) return showMsg('ФИО: только кириллица и пробелы', 'error');
    if (!rePhone.test(phone))   return showMsg('Телефон в формате 8(XXX)XXX-XX-XX', 'error');
    if (!reEmail.test(email))   return showMsg('Некорректный email', 'error');

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password, full_name, phone, email }),
        });
        const data = await res.json();
        if (!res.ok) {
            showMsg(data.error || 'Ошибка регистрации', 'error');
            return;
        }
        showMsg('Пользователь создан. Перенаправляем на вход…', 'success');
        setTimeout(() => { window.location.href = '/'; }, 1200);
    } catch (err) {
        showMsg('Сервер недоступен', 'error');
    }
});
