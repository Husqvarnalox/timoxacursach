# Портал «Корочки.есть»

Информационная система для записи на онлайн-курсы дополнительного профессионального образования.
Реализован весь функционал из билета демоэкзамена: регистрация, авторизация, подача заявок,
отзывы, панель администратора.

---

## Содержание
1. [Стек технологий и обоснование](#1-стек-технологий-и-обоснование)
2. [Структура проекта](#2-структура-проекта)
3. [Запуск проекта (Windows)](#3-запуск-проекта-windows)
4. [Запуск проекта (macOS / Linux)](#4-запуск-проекта-macos--linux)
5. [Запуск без Docker](#5-запуск-без-docker)
6. [Учётные данные](#6-учётные-данные)
7. [Работа с базой данных](#7-работа-с-базой-данных)
8. [API сервера](#8-api-сервера)

---

## 1. Стек технологий и обоснование

| Слой       | Технология                      | Почему именно она                                                                                  |
|------------|---------------------------------|----------------------------------------------------------------------------------------------------|
| Frontend   | HTML + CSS + JavaScript (ванильный) | Требование задания — «максимально просто». Никаких React/Vue/сборщиков.                            |
| Backend    | Node.js + Express               | Браузер не может ходить напрямую в PostgreSQL — нужен сервер-посредник. Express даёт минимальный роутинг HTTP. Это **не ORM**, это веб-фреймворк. |
| Драйвер БД | `pg` (node-postgres)            | Это **не ORM**, а обычный драйвер PostgreSQL. SQL пишется руками: `pool.query('SELECT ... WHERE id = $1', [id])`. |
| СУБД       | PostgreSQL 16                   | Требование задания.                                                                                |
| Docker     | Docker Compose (только для БД)  | См. ниже — Docker используется опционально, только чтобы поднять postgres одной командой.          |

### Почему именно Node.js?
- Один язык на фронте и на бэке — JS, не нужно переключаться.
- Минимум зависимостей: всего два пакета (`express`, `pg`).
- Запуск одной командой: `npm start`. Под Windows работает идентично macOS/Linux.
- Альтернативы (PHP, Python/Flask) потребовали бы установки дополнительных интерпретаторов; Node.js в этом плане проще.

### Почему стоит использовать Docker (и только для postgres)
**За:**
- Одна команда (`docker compose up -d`) поднимает базу — не нужно ставить и настраивать postgres вручную.
- Изолированное окружение: не конфликтует с postgres, который, возможно, уже стоит в системе.
- Параметры подключения предсказуемы: всегда `localhost:5432`, пользователь `korochki`, пароль `korochki_pass`.
- Полное удаление одной командой (`docker compose down -v`) — не остаётся мусора.
- На Windows работает так же, как на macOS — через Docker Desktop.

**Против:**
- Нужно установить Docker Desktop (на Windows — ~500 МБ).
- На слабых машинах виртуализация даёт оверхед.

**Вывод:** Docker используется **только для контейнера postgres**, само приложение (Node.js) запускается локально. Это даёт плюсы Docker без его минусов (контейнеризация приложения тут избыточна для демо).

Если Docker ставить не хочется — есть [вариант без Docker](#5-запуск-без-docker) с локально установленным postgres.

---

## 2. Структура проекта

```
korochki-est/
├── docker-compose.yml        # контейнер с postgres
├── package.json              # зависимости Node.js
├── server.js                 # backend (Express + pg)
├── db/
│   └── init.sql              # схема БД (выполняется автоматически при первом запуске контейнера)
├── public/                   # frontend (статические файлы)
│   ├── index.html            # страница входа
│   ├── register.html         # страница регистрации
│   ├── applications.html     # «Мои заявки» + отзывы
│   ├── new-application.html  # форма новой заявки
│   ├── admin.html            # панель администратора
│   ├── styles.css
│   └── js/
│       ├── common.js         # общие функции (сессия в localStorage, форматирование)
│       ├── login.js
│       ├── register.js       # клиентская валидация (логин/пароль/ФИО/телефон/email)
│       ├── applications.js
│       ├── new-application.js
│       └── admin.js
└── README.md
```

---

## 3. Запуск проекта (Windows)

### Что нужно установить
1. **Node.js LTS** — https://nodejs.org/ (скачать установщик `.msi`, нажимать «Далее»).
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop/ (после установки запустить, дождаться значка кита в трее).

### Запуск
Открой **PowerShell** или **cmd** в папке проекта и выполни по очереди:

```powershell
docker compose up -d
npm install
npm start
```

Открой в браузере: **http://localhost:3000**

### Что делает каждая команда
- `docker compose up -d` — поднимает контейнер postgres в фоне. При первом запуске автоматически выполнится `db/init.sql` и создаст таблицы.
- `npm install` — установит зависимости (`express`, `pg`).
- `npm start` — запустит сервер на порту 3000.

### Остановка
```powershell
# Ctrl+C в терминале с npm start
docker compose down            # остановить БД (данные сохранятся)
docker compose down -v         # остановить БД и удалить данные
```

---

## 4. Запуск проекта (macOS / Linux)

Команды идентичны Windows:
```bash
docker compose up -d
npm install
npm start
```

Открой: http://localhost:3000

---

## 5. Запуск без Docker

Если Docker ставить не хочешь — нужен локально установленный PostgreSQL.

### 5.1. Установка PostgreSQL
- **Windows:** скачай установщик с https://www.postgresql.org/download/windows/ — при установке задай пароль для пользователя `postgres`.

### 5.2. Создание БД и таблиц

Через `psql` (на Windows запускается из меню «PostgreSQL → SQL Shell»):
```sql
CREATE USER korochki WITH PASSWORD 'korochki_pass';
CREATE DATABASE korochki OWNER korochki;
\q
```

Затем накати схему (Windows PowerShell):
```powershell
psql -U korochki -d korochki -f db\init.sql
```

macOS / Linux:
```bash
psql -U korochki -d korochki -f db/init.sql
```

### 5.3. Запуск приложения
```
npm install
npm start
```

Если параметры подключения к БД отличаются (другой пароль/порт), задай переменные окружения перед запуском:

Windows PowerShell:
```powershell
$env:DB_HOST="localhost"; $env:DB_PORT="5432"; $env:DB_USER="korochki"; $env:DB_PASSWORD="korochki_pass"; $env:DB_NAME="korochki"
npm start
```

macOS / Linux:
```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=korochki DB_PASSWORD=korochki_pass DB_NAME=korochki npm start
```

---

## 6. Учётные данные

### Администратор
Логин: `Admin`
Пароль: `KorokNET`

Эти данные проверяются в коде (`server.js`, переменные `ADMIN_LOGIN`, `ADMIN_PASSWORD`), а не в БД.

### Тестовый пользователь (создаётся автоматически из `db/init.sql`)
Логин: `ivanov01`
Пароль: `password1`

### Регистрация нового пользователя
Открой http://localhost:3000/register.html и заполни форму. Валидация:
- Логин — латиница и цифры, от 6 символов
- Пароль — от 8 символов
- ФИО — только кириллица и пробелы
- Телефон — формат `8(XXX)XXX-XX-XX`
- Email — стандартный формат

---

## 7. Работа с базой данных

### 7.1. Схема (3 таблицы)

```
users                       applications                  reviews
------------                ------------                  -------
id          PK              id              PK            id              PK
login       UNIQUE          user_id         FK→users.id   application_id  FK→applications.id UNIQUE
password                    course_name                   user_id         FK→users.id
full_name                   start_date                    rating          1..5
phone                       payment_method  cash|phone_transfer comment
email                       status          Новая|Идет обучение|Обучение завершено
created_at                  created_at                    created_at
```

Полная схема — в `db/init.sql`.

### 7.2. Подключение к БД для просмотра данных

**С Docker:**
```bash
docker exec -it korochki_db psql -U korochki -d korochki
```

**Без Docker (на любой ОС):**
```bash
psql -U korochki -d korochki -h localhost
```

После подключения откроется интерактивная консоль `korochki=#`.

### 7.3. Полезные SQL-запросы

```sql
-- список таблиц
\dt

-- структура таблицы
\d users
\d applications
\d reviews

-- все пользователи
SELECT id, login, full_name, phone, email FROM users;

-- все заявки с именем пользователя
SELECT a.id, u.full_name, a.course_name, a.start_date, a.status
FROM applications a
JOIN users u ON u.id = a.user_id
ORDER BY a.created_at DESC;

-- заявки с отзывами
SELECT a.id, a.course_name, a.status, r.rating, r.comment
FROM applications a
LEFT JOIN reviews r ON r.application_id = a.id;

-- ручное изменение статуса (то же, что делает админ-панель)
UPDATE applications SET status = 'Идет обучение' WHERE id = 1;

-- удалить пользователя (каскадно удалит его заявки и отзывы)
DELETE FROM users WHERE login = 'ivanov01';

-- выйти из psql
\q
```

### 7.4. Сброс БД

**С Docker** (удалит все данные):
```bash
docker compose down -v
docker compose up -d
```
При следующем старте контейнера `init.sql` выполнится заново.

**Без Docker:**
```sql
DROP TABLE reviews, applications, users CASCADE;
\i db/init.sql
```

### 7.5. Изменение схемы

Правь файл `db/init.sql`. Чтобы изменения применились:
- **С Docker:** `docker compose down -v && docker compose up -d` (удаляет данные!).
- **Без Docker:** примени изменения вручную через `psql` (`ALTER TABLE ...`) — `init.sql` выполняется только при пустой БД.

---

## 8. API сервера

Все эндпоинты возвращают JSON.

| Метод  | Путь                              | Описание                                                    |
|--------|-----------------------------------|-------------------------------------------------------------|
| POST   | `/api/register`                   | Регистрация пользователя                                    |
| POST   | `/api/login`                      | Вход (для обычного пользователя и для админа)               |
| GET    | `/api/applications?user_id=N`     | Получить заявки конкретного пользователя                    |
| POST   | `/api/applications`               | Создать новую заявку                                        |
| POST   | `/api/reviews`                    | Оставить/обновить отзыв на свою заявку                      |
| GET    | `/api/admin/applications`         | Все заявки (для админ-панели)                               |
| PATCH  | `/api/admin/applications/:id`     | Сменить статус заявки                                       |

> **Замечание про безопасность.** Пароли хранятся в БД в открытом виде (для простоты демо).
> Авторизация на бэкенде упрощённая: `user_id` передаётся клиентом. В реальной системе
> нужно хешировать пароли (например, `bcrypt`) и проверять сессии/JWT на сервере.

---

## Сценарий проверки функционала

1. Открой http://localhost:3000 — увидишь форму входа.
2. Жми «Еще не зарегистрированы? Регистрация», заполни форму, проверь валидации
   (попробуй ввести `qwe` в логин — выдаст ошибку про длину).
3. После регистрации войди под новым пользователем.
4. На странице «Мои заявки» жми «Новая заявка» — заполни форму, отправь.
5. Выйди, войди как `Admin` / `KorokNET` — попадёшь в админ-панель.
6. Поменяй статус заявки на «Идет обучение», затем на «Обучение завершено».
7. Выйди, войди обратно под обычным пользователем — увидишь новый статус,
   оставь отзыв (оценка 1–5 + комментарий).
