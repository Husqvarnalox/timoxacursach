const session = requireAdmin();
if (session) {
    setupHeader(session);
    loadAll();
}

async function loadAll() {
    try {
        const res = await fetch('/api/admin/applications');
        const data = await res.json();
        if (!res.ok) { showMsg(data.error || 'Ошибка загрузки', 'error'); return; }
        render(data.applications);
    } catch (err) {
        showMsg('Сервер недоступен', 'error');
    }
}

function render(apps) {
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
            <td>${escapeHtml(a.full_name)}<br><span class="muted">${escapeHtml(a.login)}</span></td>
            <td>${escapeHtml(a.phone)}<br><span class="muted">${escapeHtml(a.email)}</span></td>
            <td>${escapeHtml(a.course_name)}</td>
            <td>${formatDate(a.start_date)}</td>
            <td>${paymentLabel(a.payment_method)}</td>
            <td>${statusBadge(a.status)}</td>
            <td>
                <select data-id="${a.id}" class="status-select">
                    <option value="Новая"             ${a.status==='Новая'?'selected':''}>Новая</option>
                    <option value="Идет обучение"     ${a.status==='Идет обучение'?'selected':''}>Идет обучение</option>
                    <option value="Обучение завершено" ${a.status==='Обучение завершено'?'selected':''}>Обучение завершено</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    }
    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', onStatusChange);
    });
}

async function onStatusChange(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.value;
    try {
        const res = await fetch('/api/admin/applications/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) { showMsg(data.error || 'Ошибка обновления', 'error'); return; }
        showMsg('Статус обновлён', 'success');
        loadAll();
    } catch (err) {
        showMsg('Сервер недоступен', 'error');
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
