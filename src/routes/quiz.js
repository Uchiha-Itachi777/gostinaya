const express = require('express');
const prisma = require('../db');

const router = express.Router();

// Сохранение результатов квиза
router.post('/', async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user ? req.user.id : null;

    const result = await prisma.quizResult.create({
      data: {
        userId,
        answers: answers || {}
      }
    });

    res.status(201).json({ success: true, resultId: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сохранения результатов квиза' });
  }
});

module.exports = router;