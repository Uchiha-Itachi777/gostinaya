// Авторизация: JWT хранится в httpOnly-куке (JS на странице не может её прочитать)
const jwt = require('jsonwebtoken');

const COOKIE = 'token';

function setAuthCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // на Vercel — только по HTTPS
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE);
}

// Достаёт id пользователя из куки (или null, если не вошёл)
function readUserId(req) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id;
  } catch (e) {
    return null;
  }
}

// Для страниц, доступных всем (но мы хотим знать, кто смотрит)
function optionalAuth(req, res, next) {
  req.userId = readUserId(req);
  next();
}

// Для действий, где нужен вход
function requireAuth(req, res, next) {
  req.userId = readUserId(req);
  if (!req.userId) return res.status(401).json({ error: 'Войди в гостиную, чтобы это сделать' });
  next();
}

module.exports = { setAuthCookie, clearAuthCookie, optionalAuth, requireAuth };
