-- Схема БД для портала «Корочки.есть» (SQLite)
-- Этот файл выполняется автоматически при запуске сервера (см. server.js).
-- Использует CREATE TABLE IF NOT EXISTS, поэтому безопасно вызывать многократно.

CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    login        VARCHAR(50)  UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,
    full_name    VARCHAR(200) NOT NULL,
    phone        VARCHAR(20)  NOT NULL,
    email        VARCHAR(100) NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_name    VARCHAR(200) NOT NULL,
    start_date     DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'phone_transfer')),
    status         VARCHAR(30) NOT NULL DEFAULT 'Новая'
                   CHECK (status IN ('Новая', 'Идет обучение', 'Обучение завершено')),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id  INTEGER UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Демо-пользователь (можно удалить)
INSERT OR IGNORE INTO users (login, password, full_name, phone, email) VALUES
    ('ivanov01', 'password1', 'Иванов Иван Иванович', '8(900)123-45-67', 'ivanov@example.com');
