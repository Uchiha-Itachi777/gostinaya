const express = require('express');
const prisma = require('../db');

const router = express.Router();

// Список городов и их жителей
router.get('/', async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      include: {
        users: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении списка городов' });
  }
});

module.exports = router;