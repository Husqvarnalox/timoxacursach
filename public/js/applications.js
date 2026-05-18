const session = requireUser();
if (session) {
    setupHeader(session);
    loadApplications();
}

async function loadApplications() {
    try {
        const res = await fetch('/api/applications?user_id=' + session.user.id);
        const data = await res.json();
        if (!res.ok) { showMsg(data.error || 'Ошибка загрузки', 'error'); return; }
        renderApplications(data.applications);
    } catch (err) {
        showMsg('Сервер недоступен', 'error');
    }
}

function renderApplications(apps) {
    const tbody = document.getElementById('apps-body');
    const table = document.getElementById('apps-table');
    const empty = document.getElementById('empty');

    if (!apps.length) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    table.style.display = '';
    empty.style.display = 'none';

    tbody.innerHTML = '';
    for (const a of apps) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.id}</td>
            <td>${escapeHtml(a.course_name)}</td>
            <td>${formatDate(a.start_date)}</td>
            <td>${paymentLabel(a.payment_method)}</td>
            <td>${statusBadge(a.status)}</td>
            <td>${reviewCell(a)}</td>
        `;
        tbody.appendChild(tr);
    }
    document.querySelectorAll('.review-form').forEach(form => {
        form.addEventListener('submit', onReviewSubmit);
    });
}

function reviewCell(a) {
    if (a.rating) {
        return `<div class="review-existing">Оценка: ${a.rating}/5<br>${escapeHtml(a.comment || '')}</div>`
             + reviewFormHtml(a, a.rating, a.comment);
    }
    return reviewFormHtml(a, '', '');
}

function reviewFormHtml(a, rating, comment) {
    return `
        <form class="review-form" data-app-id="${a.id}">
            <label>Оценка (1–5)</label>
            <input type="number" name="rating" min="1" max="5" value="${rating || ''}" required>
            <label>Комментарий</label>
            <textarea name="comment">${escapeHtml(comment || '')}</textarea>
            <button class="small" type="submit">${rating ? 'Обновить отзыв' : 'Оставить отзыв'}</button>
        </form>
    `;
}

async function onReviewSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const application_id = Number(form.dataset.appId);
    const rating = form.elements.rating.value;
    const comment = form.elements.comment.value;
    try {
        const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ application_id, user_id: session.user.id, rating, comment }),
        });
        const data = await res.json();
        if (!res.ok) { showMsg(data.error || 'Ошибка', 'error'); return; }
        showMsg('Отзыв сохранён', 'success');
        loadApplications();
    } catch (err) {
        showMsg('Сервер недоступен', 'error');
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
