const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Инициализируем SDK Gemini (ключ берётся автоматически из process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI();

router.post('/comment', requireAuth, async (req, res) => {
  try {
    const { ideaId } = req.body;
    if (!ideaId) {
      return res.status(400).json({ error: 'Не указан ID идеи' });
    }

    // Находим идею в базе данных вместе с автором
    const idea = await prisma.idea.findUnique({
      where: { id: parseInt(ideaId) },
      include: { author: true }
    });

    if (!idea) {
      return res.status(404).json({ error: 'Идея не найдена' });
    }

    // Формируем промпт для Луми
    const prompt = `Ты — Луми, дружелюбный и конструктивный ИИ-напарник в сообществе «Гостиная идей». 
Участник по имени ${idea.author.name} опубликовал проект:
Название: "${idea.title}"
Категория: "${idea.category}"
Суть/Запрос: "${idea.need}"
Описание: "${idea.description}"

Напиши короткий, поддерживающий и полезный комментарий-совет по развитию этой идеи (в пределах 3-4 предложений), оцени сильные стороны и предложи один практический шаг для проверки гипотезы. Отвечай на русском языке.`;

    // Вызываем модель Gemini Flash
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
    });

    const aiText = response.text || 'Луми внимательно изучил проект, но остался без слов. Отличная задумка!';

    // Сохраняем комментарий ИИ в базу данных с флагом isAi: true
    const newComment = await prisma.comment.create({
      data: {
        text: aiText,
        ideaId: idea.id,
        isAi: true,
        authorId: null // У Луми нет ID пользователя
      }
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Ошибка Gemini API:', error);
    res.status(500).json({ error: 'Не удалось получить ответ от ИИ-напарника' });
  }
});

module.exports = router;