# Гостиная идей

Веб-приложение-сообщество: идеи, обсуждения, мероприятия, ИИ-напарник Луми.

**Стек:** Node.js, Express, PostgreSQL (Neon), Prisma, JWT, Google Gemini API.

## Запуск

1. `npm install`
2. Создай бесплатную БД на https://neon.tech, скопируй `.env.example` в `.env`, вставь строки подключения.
3. `npm run db:push` — создаст таблицы.
4. `npm run db:seed` — стартовые данные (демо-пароль у всех: `demo12345`).
5. `npm run dev` — открой http://localhost:3000 и http://localhost:3000/api/health

## Структура
- `prisma/schema.prisma` — схема БД
- `prisma/seed.js` — стартовые данные
- `src/` — бэкенд
- `public/` — фронтенд

## Статус
- [x] Этап 1: схема БД, каркас
- [x] Этап 2: авторизация, идеи, комментарии, реакции
- [ ] Этап 3: мероприятия, города, статистика, квиз
- [ ] Этап 4: ИИ Луми (Gemini)
- [ ] Этап 5: подключение фронтенда, деплой на Vercel

## API (этап 2)
| Метод | Адрес | Что делает | Вход нужен |
|---|---|---|---|
| POST | /api/auth/register | регистрация (email, password, name, role?, city?) | нет |
| POST | /api/auth/login | вход | нет |
| POST | /api/auth/logout | выход | нет |
| GET | /api/auth/me | кто сейчас вошёл (или null) | нет |
| GET | /api/ideas?category=&q= | лента идей, поиск и фильтр | нет |
| POST | /api/ideas | опубликовать идею | да |
| POST | /api/ideas/:id/react | поставить/снять реакцию (type: like \| help) | да |
| POST | /api/ideas/:id/comments | добавить комментарий (text) | да |

Пароли хранятся в виде bcrypt-хеша, сессия — JWT в httpOnly-куке на 7 дней.
Все входные данные проверяются схемами zod (src/routes/*.js).
