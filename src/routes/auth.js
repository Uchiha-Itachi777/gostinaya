// Регистрация, вход, выход, текущий пользователь
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../db');
const wrap = require('../middleware/wrap');
const validate = require('../middleware/validate');
const { setAuthCookie, clearAuthCookie, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email').optional(),
  password: z.string().min(6, 'Пароль — минимум 6 символов').max(72, 'Пароль слишком длинный').optional(),
  name: z.string().trim().min(1, 'Напиши, как к тебе обращаться').max(24, 'Имя — не длиннее 24 символов'),
  role: z.string().trim().max(60).optional(),
  city: z.string().trim().max(40).optional(), // название города из списка
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email'),
  password: z.string().min(1, 'Введи пароль'),
});

// Что отдаём наружу (без passwordHash!)
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, city: u.city ? u.city.name : null });

router.post('/register', validate(registerSchema), wrap(async (req, res) => {
  let { email, password, name, role, city } = req.body;

  // Если email или пароль не переданы (быстрый вход из модалки), генерируем их автоматически
  if (!email) {
    const randomStr = Math.random().toString(36).substring(2, 8);
    email = `user_${Date.now()}_${randomStr}@gostinaya.local`;
  }
  if (!password) {
    password = 'default_password_123';
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: 'Пользователь с таким email уже есть' });
  }

  const cityRow = city ? await prisma.city.findUnique({ where: { name: city } }) : null;
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      ...(role ? { role } : {}),
      ...(cityRow ? { cityId: cityRow.id } : {}),
    },
    include: { city: true },
  });

  setAuthCookie(res, user.id);
  res.status(201).json({ user: publicUser(user) });
}));

router.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email }, include: { city: true } });

  // одинаковый ответ для «нет такого email» и «неверный пароль» — так безопаснее
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  setAuthCookie(res, user.id);
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// Фронтенд зовёт это при загрузке страницы, чтобы узнать, кто вошёл
router.get('/me', optionalAuth, wrap(async (req, res) => {
  if (!req.userId) return res.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: req.userId }, include: { city: true } });
  res.json({ user: user ? publicUser(user) : null });
}));

module.exports = router;