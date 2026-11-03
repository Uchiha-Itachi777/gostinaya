const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Список всех мероприятий
router.get('/', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        city: true,
        registrations: { select: { userId: true } }
      },
      orderBy: { startsAt: 'asc' }
    });

    const formatted = events.map(e => ({
      ...e,
      participantsCount: e.registrations.length,
      isRegistered: req.user ? e.registrations.some(r => r.userId === req.user.id) : false
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера при получении мероприятий' });
  }
});

// Записаться / Отменить запись на мероприятие
router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;

    const existing = await prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } }
    });

    if (existing) {
      await prisma.eventRegistration.delete({
        where: { id: existing.id }
      });
      return res.json({ registered: false, message: 'Запись отменена' });
    }

    await prisma.eventRegistration.create({
      data: { userId, eventId }
    });

    res.json({ registered: true, message: 'Вы успешно записаны!' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка записи на мероприятие' });
  }
});

module.exports = router;