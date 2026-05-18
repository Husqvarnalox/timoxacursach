const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'korochki',
  password: process.env.DB_PASSWORD || 'korochki_pass',
  database: process.env.DB_NAME || 'korochki',
});

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

app.post('/api/register', async (req, res) => {
  const err = validateRegister(req.body);
  if (err) return res.status(400).json({ error: err });

  const { login, password, full_name, phone, email } = req.body;
  if (login === ADMIN_LOGIN) return res.status(400).json({ error: 'Этот логин занят' });

  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE login = $1', [login]);
    if (exists.rowCount > 0) return res.status(400).json({ error: 'Логин уже занят' });

    const r = await pool.query(
      `INSERT INTO users (login, password, full_name, phone, email)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, login, full_name`,
      [login, password, full_name, phone, email]
    );
    res.json({ ok: true, user: r.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.post('/api/login', async (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Введите логин и пароль' });

  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    return res.json({ ok: true, role: 'admin', user: { id: 0, login: 'Admin', full_name: 'Администратор' } });
  }

  try {
    const r = await pool.query(
      'SELECT id, login, full_name FROM users WHERE login = $1 AND password = $2',
      [login, password]
    );
    if (r.rowCount === 0) return res.status(401).json({ error: 'Неверный логин или пароль' });
    res.json({ ok: true, role: 'user', user: r.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.get('/api/applications', async (req, res) => {
  const userId = Number(req.query.user_id);
  if (!userId) return res.status(400).json({ error: 'user_id обязателен' });
  try {
    const r = await pool.query(
      `SELECT a.id, a.course_name, a.start_date, a.payment_method, a.status, a.created_at,
              r.rating, r.comment
       FROM applications a
       LEFT JOIN reviews r ON r.application_id = a.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );
    res.json({ ok: true, applications: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.post('/api/applications', async (req, res) => {
  const { user_id, course_name, start_date, payment_method } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'Не авторизован' });
  if (!course_name || !course_name.trim()) return res.status(400).json({ error: 'Введите название курса' });
  if (!start_date) return res.status(400).json({ error: 'Укажите дату начала' });
  if (!['cash', 'phone_transfer'].includes(payment_method))
    return res.status(400).json({ error: 'Выберите способ оплаты' });

  try {
    const r = await pool.query(
      `INSERT INTO applications (user_id, course_name, start_date, payment_method)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user_id, course_name.trim(), start_date, payment_method]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { application_id, user_id, rating, comment } = req.body || {};
  if (!application_id || !user_id) return res.status(400).json({ error: 'Некорректный запрос' });
  const ratingNum = Number(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: 'Оценка от 1 до 5' });

  try {
    const own = await pool.query(
      'SELECT 1 FROM applications WHERE id = $1 AND user_id = $2',
      [application_id, user_id]
    );
    if (own.rowCount === 0) return res.status(403).json({ error: 'Заявка не принадлежит вам' });

    await pool.query(
      `INSERT INTO reviews (application_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (application_id) DO UPDATE
         SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = CURRENT_TIMESTAMP`,
      [application_id, user_id, ratingNum, comment || '']
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.get('/api/admin/applications', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.id, a.course_name, a.start_date, a.payment_method, a.status, a.created_at,
              u.login, u.full_name, u.phone, u.email
       FROM applications a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC`
    );
    res.json({ ok: true, applications: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.patch('/api/admin/applications/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ['Новая', 'Идет обучение', 'Обучение завершено'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });

  try {
    const r = await pool.query(
      'UPDATE applications SET status = $1 WHERE id = $2 RETURNING id',
      [status, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Заявка не найдена' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
