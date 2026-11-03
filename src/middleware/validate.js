// Проверка тела запроса схемой zod; при ошибке отвечает 400 с понятным текстом
module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const msg = result.error.issues[0]?.message || 'Некорректные данные';
    return res.status(400).json({ error: msg });
  }
  req.body = result.data;
  next();
};
