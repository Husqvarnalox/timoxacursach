const session = requireUser();
if (session) setupHeader(session);

document.getElementById('new-app-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();

    const course_name = document.getElementById('course_name').value.trim();
    const start_date = document.getElementById('start_date').value;
    const payment_method = document.getElementById('payment_method').value;

    if (!course_name)    return showMsg('Введите название курса', 'error');
    if (!start_date)     return showMsg('Укажите дату начала', 'error');
    if (!payment_method) return showMsg('Выберите способ оплаты', 'error');

    try {
        const res = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: session.user.id, course_name, start_date, payment_method,
            }),
        });
        const data = await res.json();
        if (!res.ok) { showMsg(data.error || 'Ошибка отправки', 'error'); return; }
        showMsg('Заявка отправлена администратору', 'success');
        setTimeout(() => { window.location.href = '/applications.html'; }, 1000);
    } catch (err) {
        showMsg('Сервер недоступен', 'error');
    }
});
