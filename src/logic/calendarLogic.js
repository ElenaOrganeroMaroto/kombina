const calendarData = require('../data/calendarData');
const { AppError } = require('./errors');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Devuelve { 'AAAA-MM-DD': [idOutfit, ...] }
const getCalendar = async (userId) => {
  if (!userId) throw new AppError('Se requiere el ID de usuario', 400);
  const entries = await calendarData.findByUser(userId);
  const map = {};
  entries.forEach(e => { if (e.outfitIds.length) map[e.date] = e.outfitIds; });
  return map;
};

// Fija los outfits de un día (lista vacía = quitar el día)
const setDay = async (userId, date, outfitIds) => {
  if (!userId || !Array.isArray(outfitIds)) {
    throw new AppError('Faltan datos obligatorios para el calendario', 400);
  }
  if (!DATE_REGEX.test(date)) throw new AppError('Fecha no válida', 400);

  if (outfitIds.length === 0) {
    await calendarData.deleteDay(userId, date);
    return { date, outfitIds: [] };
  }
  const entry = await calendarData.upsertDay(userId, date, outfitIds.map(String));
  return { date: entry.date, outfitIds: entry.outfitIds };
};

module.exports = { getCalendar, setDay };