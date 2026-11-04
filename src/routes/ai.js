const express = require('express');
const prisma = require('../db');
const wrap = require('../middleware/wrap');
const { requireAuth } = require('../middleware/auth');
const { loadIdea } = require('./ideas');

const router = express.Router();

// POST /api/ai/comment — Луми анализирует идею и оставляет комментарий через OpenRouter
router.post('/comment', requireAuth, wrap(async (req, res) => {
  const { ideaId } = req.body;
  
  if (!ideaId) {
    return res.status(400).json({ error: 'Не указан ID идеи' });
  }

  // 1. Находим идею в базе
  const idea = await prisma.idea.findUnique({
    where: { id: Number(ideaId) },
    include: { author: { select: { name: true } }, comments: { select: { isAi: true } } }
  });

  if (!idea) {
    return res.status(404).json({ error: 'Идея не найдена' });
  }

  // 2. Защита: 1 ответ Луми на идею
  const alreadyHasAi = idea.comments.some(c => c.isAi);
  if (alreadyHasAi) {
    return res.status(409).json({ error: 'Луми уже дал совет по этой идее' });
  }

  // 3. Достаем ключ OpenRouter (поддерживаем оба варианта переменных)
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ИИ-напарник временно недоступен: не настроен ключ API' });
  }

  // 4. Формируем промпт для Луми
  const prompt = `Ты — Луми, дружелюбный и конструктивный ИИ-напарник в сообществе «Гостиная идей». 
Пользователь опубликовал идею. Напиши короткий, поддерживающий и полезный комментарий-совет (3-4 предложения на русском языке), оцени сильные стороны и предложи один шаг для развития.

Название идеи: ${idea.title}
Описание: ${idea.description}
Направление: ${idea.category}
Тип помощи: ${idea.need}`;

  try {
    // 5. Делаем запрос к OpenRouter (используем стабильную бесплатную модель)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://gostinaya.vercel.app',
        'X-Title': 'Gostinaya Idey',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat', // Быстрая, умная и стабильная модель
        messages: [
          { role: 'system', content: 'Ты — полезный ИИ-помощник Луми.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter Error:', response.status, errText);
      return res.status(502).json({ error: 'Не удалось получить ответ от ИИ-напарника' });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content?.trim();

    if (!aiText) {
      return res.status(502).json({ error: 'ИИ вернул пустой ответ' });
    }

    // 6. Сохраняем комментарий Луми в базу данных с флагом isAi: true
    await prisma.comment.create({
      data: {
        text: aiText,
        ideaId: idea.id,
        isAi: true
      }
    });

    // 7. Возвращаем обновленную идею на фронтенд
    const updatedIdea = await loadIdea(idea.id, req.userId);
    res.json({ idea: updatedIdea });

  } catch (err) {
    console.error('AI Request Exception:', err);
    res.status(502).json({ error: 'Ошибка связи с сервером ИИ' });
  }
}));

module.exports = router;