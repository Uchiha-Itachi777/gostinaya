// Идеи, комментарии, реакции
const express = require('express');
const { z } = require('zod');
const prisma = require('../db');
const wrap = require('../middleware/wrap');
const validate = require('../middleware/validate');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { CATEGORIES, NEEDS, REACTION_TYPES } = require('../constants');

const router = express.Router();

// Одинаковая выборка для всех маршрутов: идея + автор + комментарии + реакции
const ideaInclude = {
  author: { select: { id: true, name: true } },
  comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, name: true } } } },
  reactions: { select: { type: true, userId: true } },
};

// Превращаем запись БД в удобный для фронтенда объект (счётчики считаем здесь)
function toDto(idea, userId) {
  const mine = (type) => !!userId && idea.reactions.some((r) => r.type === type && r.userId === userId);
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    category: idea.category,
    need: idea.need,
    createdAt: idea.createdAt,
    author: idea.author.name,
    likes: idea.reactions.filter((r) => r.type === 'like').length,
    helps: idea.reactions.filter((r) => r.type === 'help').length,
    myReactions: { like: mine('like'), help: mine('help') },
    comments: idea.comments.map((c) => ({
      id: c.id,
      text: c.text,
      isAi: c.isAi,
      author: c.isAi ? 'Луми' : c.author ? c.author.name : 'Удалён',
      createdAt: c.createdAt,
    })),
  };
}

async function loadIdea(id, userId) {
  const idea = await prisma.idea.findUnique({ where: { id }, include: ideaInclude });
  return idea ? toDto(idea, userId) : null;
}

// Достаём :id из адреса; если не число — 404
function parseId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Идея не найдена' });
  req.ideaId = id;
  next();
}

const ideaSchema = z.object({
  title: z.string().trim().min(1, 'Добавь название идеи').max(100, 'Название — не длиннее 100 символов'),
  description: z.string().trim().min(1, 'Добавь описание идеи').max(1200, 'Описание — не длиннее 1200 символов'),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Неизвестное направление' }) }),
  // Контракт с фронтендом: поле называется `need` и берётся из фиксированного списка
  need: z.enum(NEEDS, { errorMap: () => ({ message: 'Неизвестный тип помощи' }) }),
});

const commentSchema = z.object({
  text: z.string().trim().min(1, 'Напиши комментарий').max(500, 'Комментарий — не длиннее 500 символов'),
});
const reactSchema = z.object({
  type: z.enum(REACTION_TYPES, { errorMap: () => ({ message: 'Неизвестный тип реакции' }) }),
});

// GET /api/ideas?category=Экология&q=текст  — лента (новые сверху)
router.get('/', optionalAuth, wrap(async (req, res) => {
  const { category, q } = req.query;
  const where = {};
  if (category && category !== 'Все') where.category = String(category);
  if (q && String(q).trim()) {
    const text = String(q).trim();
    where.OR = [
      { title: { contains: text, mode: 'insensitive' } },
      { description: { contains: text, mode: 'insensitive' } },
      { author: { name: { contains: text, mode: 'insensitive' } } },
    ];
  }
  const ideas = await prisma.idea.findMany({ where, include: ideaInclude, orderBy: { createdAt: 'desc' } });
  res.json({ ideas: ideas.map((i) => toDto(i, req.userId)) });
}));

// POST /api/ideas {title, description, category, need} — опубликовать идею
router.post('/', requireAuth, validate(ideaSchema), wrap(async (req, res) => {
  const idea = await prisma.idea.create({ data: { ...req.body, authorId: req.userId }, include: ideaInclude });
  res.status(201).json({ idea: toDto(idea, req.userId) });
}));

// POST /api/ideas/:id/react  {type:'like'|'help'} — поставить или снять реакцию
router.post('/:id/react', requireAuth, parseId, validate(reactSchema), wrap(async (req, res) => {
  if (!(await prisma.idea.findUnique({ where: { id: req.ideaId }, select: { id: true } }))) {
    return res.status(404).json({ error: 'Идея не найдена' });
  }
  const key = { userId_ideaId_type: { userId: req.userId, ideaId: req.ideaId, type: req.body.type } };
  const existing = await prisma.reaction.findUnique({ where: key });
  if (existing) await prisma.reaction.delete({ where: key });
  else await prisma.reaction.create({ data: { userId: req.userId, ideaId: req.ideaId, type: req.body.type } });
  res.json({ idea: await loadIdea(req.ideaId, req.userId) });
}));

// POST /api/ideas/:id/comments  {text} — добавить комментарий
router.post('/:id/comments', requireAuth, parseId, validate(commentSchema), wrap(async (req, res) => {
  if (!(await prisma.idea.findUnique({ where: { id: req.ideaId }, select: { id: true } }))) {
    return res.status(404).json({ error: 'Идея не найдена' });
  }
  await prisma.comment.create({ data: { text: req.body.text, ideaId: req.ideaId, authorId: req.userId } });
  res.status(201).json({ idea: await loadIdea(req.ideaId, req.userId) });
}));

module.exports = router;
module.exports.loadIdea = loadIdea; // используется ИИ-модулем (ai.js)