const clothingData = require('../data/clothingData');
const outfitData = require('../data/outfitData');
const calendarData = require('../data/calendarData');
const { AppError } = require('./errors');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TOP_LIMIT = 5;          // cuántas prendas / outfits se muestran en los rankings
const UNUSED_PREVIEW_LIMIT = 6; // cuántas prendas olvidadas se devuelven con detalle

const idOf = (doc) => String(doc && (doc._id || doc.id));

// Fecha de hoy como 'AAAA-MM-DD' (hora local del servidor)
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Comprueba que 'AAAA-MM-DD' es una fecha real (descarta, por ejemplo, 2026-02-30)
const isValidDateKey = (key) => {
  if (typeof key !== 'string' || !DATE_REGEX.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

// Orden de los rankings: más usos primero; en empate, por nombre y después por id (orden estable)
const byCountThenName = (countKey) => (a, b) =>
  (b[countKey] - a[countKey]) ||
  String(a.name || '').localeCompare(String(b.name || ''), 'es') ||
  a.id.localeCompare(b.id);

const toClothingSummary = (item, uses) => ({
  id: idOf(item),
  name: item.name,
  category: item.category,
  image: item.image,
  uses
});

// Calcula las estadísticas a partir de los datos del usuario (función pura, sin acceso a la base de datos)
const computeStats = ({ clothing = [], outfits = [], calendar = [], today = todayKey() } = {}) => {
  // 1. Prendas por categoría
  const categoryCounts = new Map();
  clothing.forEach(item => {
    const category = item.category || 'Sin categoría';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });
  const byCategory = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count, percent: percent(count, clothing.length) }))
    .sort((a, b) => (b.count - a.count) || a.category.localeCompare(b.category, 'es'));

  // 2. Uso de cada prenda: en cuántos outfits distintos aparece (las prendas borradas se ignoran)
  const clothingById = new Map(clothing.map(item => [idOf(item), item]));
  const usesByClothing = new Map();
  outfits.forEach(outfit => {
    const idsInOutfit = new Set((outfit.items || []).map(idOf).filter(id => clothingById.has(id)));
    idsInOutfit.forEach(id => usesByClothing.set(id, (usesByClothing.get(id) || 0) + 1));
  });

  const clothingWithUses = clothing.map(item => toClothingSummary(item, usesByClothing.get(idOf(item)) || 0));
  const topClothing = clothingWithUses
    .filter(item => item.uses > 0)
    .sort(byCountThenName('uses'))
    .slice(0, TOP_LIMIT);
  const unused = clothingWithUses
    .filter(item => item.uses === 0)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es') || a.id.localeCompare(b.id));

  // 3. Calendario: solo cuentan los outfits que siguen existiendo
  const outfitById = new Map(outfits.map(outfit => [idOf(outfit), outfit]));
  const daysByOutfit = new Map();
  const plannedDates = [];
  calendar.forEach(entry => {
    const validIds = [...new Set((entry.outfitIds || []).map(String))].filter(id => outfitById.has(id));
    if (validIds.length === 0 || !isValidDateKey(entry.date)) return;
    plannedDates.push(entry.date);
    validIds.forEach(id => daysByOutfit.set(id, (daysByOutfit.get(id) || 0) + 1));
  });
  plannedDates.sort();

  const topOutfits = [...daysByOutfit.entries()]
    .map(([id, days]) => ({ id, name: outfitById.get(id).name, days }))
    .sort(byCountThenName('days'))
    .slice(0, TOP_LIMIT);

  // 4. Cobertura del mes de 'today' y próximo día planificado
  const [year, month] = today.split('-').map(Number);
  const monthPrefix = today.slice(0, 7);
  const totalDays = daysInMonth(year, month);
  const plannedInMonth = plannedDates.filter(date => date.startsWith(monthPrefix)).length;
  const nextPlannedDate = plannedDates.find(date => date >= today) || null;

  return {
    totals: {
      clothing: clothing.length,
      outfits: outfits.length,
      plannedDays: plannedDates.length
    },
    byCategory,
    usage: {
      usedClothing: clothing.length - unused.length,
      usageRate: percent(clothing.length - unused.length, clothing.length)
    },
    topClothing,
    unusedClothing: {
      count: unused.length,
      items: unused.slice(0, UNUSED_PREVIEW_LIMIT)
    },
    topOutfits,
    month: {
      month: monthPrefix,
      totalDays,
      plannedDays: plannedInMonth,
      coverage: percent(plannedInMonth, totalDays)
    },
    nextPlannedDate
  };
};

// Estadísticas del usuario con sesión iniciada. 'today' es opcional (fecha local del navegador)
const getStats = async (userId, today) => {
  if (!userId) throw new AppError('Se requiere el ID de usuario', 400);
  if (today !== undefined && !isValidDateKey(today)) throw new AppError('Fecha no válida', 400);

  const [clothing, outfits, calendar] = await Promise.all([
    clothingData.findByUser(userId),
    outfitData.findByUser(userId),
    calendarData.findByUser(userId)
  ]);
  return computeStats({ clothing, outfits, calendar, today: today || todayKey() });
};

module.exports = { computeStats, getStats, isValidDateKey };
