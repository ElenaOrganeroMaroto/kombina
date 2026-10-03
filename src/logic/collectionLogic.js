const collectionData = require('../data/collectionData');
const { AppError } = require('./errors');

const getCollections = async (userId) => {
  if (!userId) throw new AppError('Se requiere el ID de usuario', 400);
  return await collectionData.findByUser(userId);
};

const addCollection = async ({ name, userId }) => {
  if (!name || !userId) throw new AppError('Faltan datos obligatorios para la colección', 400);
  return await collectionData.create({ userId, name, outfits: [] });
};

const renameCollection = async (id, name) => {
  if (!name) throw new AppError('Falta el nombre', 400);
  const updated = await collectionData.update(id, { name });
  if (!updated) throw new AppError('Colección no encontrada', 404);
  return updated;
};

const removeCollection = async (id) => {
  const deleted = await collectionData.remove(id);
  if (!deleted) throw new AppError('Colección no encontrada', 404);
  return deleted;
};

module.exports = { getCollections, addCollection, renameCollection, removeCollection };