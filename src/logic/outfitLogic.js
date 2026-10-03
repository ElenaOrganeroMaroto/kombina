const outfitData = require('../data/outfitData');
const calendarData = require('../data/calendarData');
const { AppError } = require('./errors');

const getOutfits = async (userId) => {
  if (!userId) throw new AppError('Se requiere el ID de usuario', 400);
  return await outfitData.findByUser(userId);
};

const addOutfit = async ({ name, items, collectionId, userId }) => {
  if (!name || !items || !userId) {
    throw new AppError('Faltan datos obligatorios para el outfit', 400);
  }
  return await outfitData.create({ name, items, collectionId: collectionId || null, userId });
};

// Solo se pueden cambiar estos campos (así no se puede reasignar el outfit a otro usuario)
const updateOutfit = async (id, body) => {
  const updates = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.items !== undefined) updates.items = body.items;
  if (body.collectionId !== undefined) updates.collectionId = body.collectionId || null;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No hay datos válidos para actualizar', 400);
  }
  const updated = await outfitData.update(id, updates);
  if (!updated) throw new AppError('Outfit no encontrado', 404);
  return updated;
};

const removeOutfit = async (id) => {
  const deleted = await outfitData.remove(id);
  if (!deleted) throw new AppError('Outfit no encontrado', 404);

  // Un outfit borrado desaparece también del calendario
  await calendarData.removeOutfitFromAllDays(deleted.userId, id);
  return deleted;
};

module.exports = { getOutfits, addOutfit, updateOutfit, removeOutfit };