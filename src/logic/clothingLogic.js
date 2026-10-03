const clothingData = require('../data/clothingData');
const { AppError } = require('./errors');

const getClothing = async (userId) => {
  if (!userId) throw new AppError('Se requiere el ID de usuario', 400);
  return await clothingData.findByUser(userId);
};

const addClothing = async ({ name, category, image, userId }) => {
  if (!name || !category || !image || !userId) {
    throw new AppError('Faltan datos obligatorios para la prenda', 400);
  }
  return await clothingData.create({ name, category, image, userId });
};

const updateClothing = async (id, { name, category }) => {
  const updates = {};
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (typeof category === 'string' && category.trim()) updates.category = category.trim();
  if (Object.keys(updates).length === 0) {
    throw new AppError('No hay datos válidos para actualizar', 400);
  }
  const updated = await clothingData.update(id, updates);
  if (!updated) throw new AppError('Prenda no encontrada', 404);
  return updated;
};

const removeClothing = async (id) => {
  const deleted = await clothingData.remove(id);
  if (!deleted) throw new AppError('Prenda no encontrada', 404);
  return deleted;
};

module.exports = { getClothing, addClothing, updateClothing, removeClothing };