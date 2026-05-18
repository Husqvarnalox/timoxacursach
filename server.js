const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'korochki.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initSql = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');
db.exec(initSql);

const ADMIN_LOGIN = 'Admin';
const ADMIN_PASSWORD = 'KorokNET';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const reLogin = /^[a-zA-Z0-9]{6,}$/;
const rePhone = /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/;
const reFio = /^[а-яА-ЯёЁ\s]+$/;
const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(b) {
  if (!b.login || !reLogin.test(b.login)) return 'Логин: латиница и цифры, минимум 6 символов';
  if (!b.password || b.password.length < 8) return 'Пароль: минимум 8 символов';
  if (!b.full_name || !reFio.test(b.full_name)) return 'ФИО: только кириллица и пробелы';
  if (!b.phone || !rePhone.test(b.phone)) return 'Телефон: формат 8(XXX)XXX-XX-XX';
  if (!b.email || !reEmail.test(b.email)) return 'Некорректный email';
  return null;
}

app.post('/api/register', (req, res) => {
  const err = validateRegister(req.body);
  if (err) return res.status(400).json({ error: err });

  const { login, password, full_name, phone, email } = req.body;
  if (login === ADMIN_LOGIN) return res.status(400).json({ error: 'Этот логин занят' });

  try {
    const exists = db.prepare('SELECT 1 FROM users WHERE login = ?').get(login);
    if (exists) return res.status(400).json({ error: 'Логин уже занят' });

    const row = db.prepare(
      `INSERT INTO users (login, password, full_name, phone, email)
       VALUES (?, ?, ?, ?, ?) RETURNING id, login, full_name`
    ).get(login, password, full_name, phone, email);

    res.json({ ok: true, user: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.post('/api/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Введите логин и пароль' });

  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    return res.json({ ok: true, role: 'admin', user: { id: 0, login: 'Admin', full_name: 'Администратор' } });
  }

  try {
    const row = db.prepare(
      'SELECT id, login, full_name FROM users WHERE login = ? AND password = ?'
    ).get(login, password);

    if (!row) return res.status(401).json({ error: 'Неверный логин или пароль' });
    res.json({ ok: true, role: 'user', user: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.get('/api/applications', (req, res) => {
  const userId = Number(req.query.user_id);
  if (!userId) return res.status(400).json({ error: 'user_id обязателен' });
  try {
    const rows = db.prepare(
      `SELECT a.id, a.course_name, a.start_date, a.payment_method, a.status, a.created_at,
              r.rating, r.comment
       FROM applications a
       LEFT JOIN reviews r ON r.application_id = a.id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC`
    ).all(userId);
    res.json({ ok: true, applications: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.post('/api/applications', (req, res) => {
  const { user_id, course_name, start_date, payment_method } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'Не авторизован' });
  if (!course_name || !course_name.trim()) return res.status(400).json({ error: 'Введите название курса' });
  if (!start_date) return res.status(400).json({ error: 'Укажите дату начала' });
  if (!['cash', 'phone_transfer'].includes(payment_method))
    return res.status(400).json({ error: 'Выберите способ оплаты' });

  try {
    const info = db.prepare(
      `INSERT INTO applications (user_id, course_name, start_date, payment_method)
       VALUES (?, ?, ?, ?)`
    ).run(user_id, course_name.trim(), start_date, payment_method);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.post('/api/reviews', (req, res) => {
  const { application_id, user_id, rating, comment } = req.body || {};
  if (!application_id || !user_id) return res.status(400).json({ error: 'Некорректный запрос' });
  const ratingNum = Number(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: 'Оценка от 1 до 5' });

  try {
    const own = db.prepare(
      'SELECT 1 FROM applications WHERE id = ? AND user_id = ?'
    ).get(application_id, user_id);
    if (!own) return res.status(403).json({ error: 'Заявка не принадлежит вам' });

    db.prepare(
      `INSERT INTO reviews (application_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(application_id) DO UPDATE
         SET rating = excluded.rating,
             comment = excluded.comment,
             created_at = CURRENT_TIMESTAMP`
    ).run(application_id, user_id, ratingNum, comment || '');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.get('/api/admin/applications', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT a.id, a.course_name, a.start_date, a.payment_method, a.status, a.created_at,
              u.login, u.full_name, u.phone, u.email
       FROM applications a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC`
    ).all();
    res.json({ ok: true, applications: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.patch('/api/admin/applications/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ['Новая', 'Идет обучение', 'Обучение завершено'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });

  try {
    const info = db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id);
    if (info.changes === 0) return res.status(404).json({ error: 'Заявка не найдена' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`БД: ${DB_PATH}`);
});
