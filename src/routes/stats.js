const express = require('express');
const prisma = require('../db');

const router = express.Router();

// Динамическая статистика для главной страницы
router.get('/', async (req, res) => {
  try {
    const [usersCount, citiesCount, quizCount, ideasCount] = await Promise.all([
      prisma.user.count(),
      prisma.city.count(),
      prisma.quizResult.count(),
      prisma.idea.count()
    ]);

    res.json({
      participants: usersCount,
      cities: citiesCount,
      quizAnswers: quizCount,
      ideas: ideasCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера при расчете статистики' });
  }
});

module.exports = router;