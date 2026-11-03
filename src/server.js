// Точка входа
require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const prisma = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('Не задан JWT_SECRET в .env');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Проверка, что сервер и БД живы
app.get('/api/health', async (req, res) => {
  try {
    const users = await prisma.user.count();
    res.json({ ok: true, users });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Нет соединения с БД' });
  }
});

// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ideas', require('./routes/ideas'));

app.use('/api/events', require('./routes/events'));
app.use('/api/cities', require('./routes/cities'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/ai', require('./routes/ai'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Такого адреса нет' }));

// Сайт (фронтенд)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Общий обработчик ошибок (чтобы сервер не падал и не показывал внутренности)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
  console.error(err);
  res.status(500).json({ error: 'Что-то пошло не так на сервере' });
});

// Для Vercel экспортируем app, для локального запуска слушаем порт
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('http://localhost:' + port));
}
module.exports = app;
