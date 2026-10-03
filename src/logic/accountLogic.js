const clothingData = require('../data/clothingData');
const outfitData = require('../data/outfitData');
const collectionData = require('../data/collectionData');
const calendarData = require('../data/calendarData');

// Borra todos los datos de un usuario (se usa al eliminar su cuenta)
const removeUserData = async (userId) => {
  await Promise.all([
    clothingData.removeByUser(userId),
    outfitData.removeByUser(userId),
    collectionData.removeByUser(userId),
    calendarData.removeByUser(userId)
  ]);
};

module.exports = { removeUserData };