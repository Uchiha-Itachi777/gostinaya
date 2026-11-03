// Наполняет БД стартовыми данными (то, что раньше было заглушками в HTML).
// Запуск: npm run db:seed
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

async function main() {
  // чистим в порядке зависимостей
  await prisma.eventRegistration.deleteMany();
  await prisma.quizResult.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();

  const cityNames = ['Бишкек', 'Алматы', 'Ташкент', 'Москва', 'Удалённо'];
  const cities = {};
  for (const name of cityNames) cities[name] = await prisma.city.create({ data: { name } });

  // демо-пользователи (пароль у всех: demo12345)
  const passwordHash = await bcrypt.hash('demo12345', 10);
  const mk = (name, email, city, role) =>
    prisma.user.create({ data: { name, email, passwordHash, role, cityId: cities[city].id } });
  const anna = await mk('Анна', 'anna@demo.kg', 'Бишкек', 'Придумываю свой проект');
  const dmitry = await mk('Дмитрий', 'dmitry@demo.kg', 'Алматы', 'Ищу команду');
  const lena = await mk('Лена', 'lena@demo.kg', 'Бишкек', 'Разрабатываю и создаю');
  const maxim = await mk('Максим', 'maxim@demo.kg', 'Москва', 'Помогаю другим идеям');
  const sofia = await mk('Софья', 'sofia@demo.kg', 'Ташкент', 'Помогаю другим идеям');

  const i1 = await prisma.idea.create({ data: {
    title: 'Планировщик питания для студентов',
    description: 'Подбирает рецепты под небольшой бюджет и то, что уже лежит в холодильнике. Хочется сделать питание проще и доступнее.',
    category: 'Здоровье', need: 'Честный отзыв', authorId: anna.id, createdAt: hoursAgo(26) } });
  const i2 = await prisma.idea.create({ data: {
    title: 'Биржа репетиторов-студентов',
    description: 'Старшекурсники проводят короткие занятия за небольшую плату. Нужны отзывы и рейтинг, чтобы появилось доверие.',
    category: 'Образование', need: 'Ищу команду', authorId: dmitry.id, createdAt: hoursAgo(8) } });
  const i3 = await prisma.idea.create({ data: {
    title: 'Трекер экологичного выбора',
    description: 'Сканируешь чек — видишь экологический след покупок и получаешь простые советы, что можно заменить.',
    category: 'Экология', need: 'Технологии', authorId: lena.id, createdAt: hoursAgo(2) } });

  await prisma.comment.createMany({ data: [
    { ideaId: i1.id, authorId: maxim.id, text: 'Классная задача! Уже спрашивали у студентов, как они планируют покупки?' },
    { ideaId: i2.id, authorId: sofia.id, text: 'Я могу помочь с дизайном и пользовательскими сценариями 🙂' },
  ] });

  // реакции (счётчики на фронте считаются из этой таблицы)
  await prisma.reaction.createMany({ data: [
    { type: 'like', userId: dmitry.id, ideaId: i1.id }, { type: 'like', userId: lena.id, ideaId: i1.id },
    { type: 'help', userId: maxim.id, ideaId: i1.id },
    { type: 'like', userId: anna.id, ideaId: i2.id }, { type: 'help', userId: sofia.id, ideaId: i2.id },
    { type: 'like', userId: anna.id, ideaId: i3.id }, { type: 'help', userId: dmitry.id, ideaId: i3.id },
  ] });

  // мероприятия (год текущий; даты как в исходном макете)
  const y = new Date().getFullYear();
  await prisma.event.createMany({ data: [
    { title: 'Как проверить идею, не потратив месяц?',
      shortText: 'Разберём простые эксперименты, первые вопросы клиентам и быстрые проверки гипотез.',
      description: 'Практическая встреча о проверке гипотез, интервью и первых шагах без большого бюджета.',
      format: 'Онлайн · открытая встреча', place: 'ZOOM / ONLINE', startsAt: new Date(y, 10, 7, 18, 0) },
    { title: 'ИИ как напарник: где он помогает по-настоящему?',
      shortText: 'Обсудим реальные сценарии, полезные инструменты и то, что по-прежнему лучше делать вместе.',
      description: 'Дискуссия о применении ИИ в работе над проектами и повседневных задачах.',
      format: 'Онлайн · дискуссия', place: 'ONLINE', startsAt: new Date(y, 10, 12, 19, 0) },
    { title: 'Встреча тех, кто что-то придумывает',
      shortText: 'Неформальное знакомство, короткие питчи и возможность найти людей для следующего шага.',
      description: 'Неформальное знакомство участников, короткие питчи и поиск партнёров.',
      format: 'Офлайн · нетворкинг', place: 'БИШКЕК / CITY', startsAt: new Date(y, 10, 16, 18, 0),
      cityId: cities['Бишкек'].id },
  ] });

  console.log('Готово: города, пользователи, идеи, комментарии, реакции, мероприятия.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
