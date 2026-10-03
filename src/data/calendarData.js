const CalendarEntry = require('../models/CalendarEntry');

const findByUser = (userId) => CalendarEntry.find({ userId });

// Fija los outfits de un día (crea la entrada si no existe)
const upsertDay = (userId, date, outfitIds) =>
  CalendarEntry.findOneAndUpdate(
    { userId, date },
    { $set: { outfitIds } },
    { new: true, upsert: true, runValidators: true }
  );

const deleteDay = (userId, date) => CalendarEntry.deleteOne({ userId, date });

// Quita un outfit de todos los días del usuario y elimina los días que queden vacíos
const removeOutfitFromAllDays = async (userId, outfitId) => {
  await CalendarEntry.updateMany({ userId }, { $pull: { outfitIds: String(outfitId) } });
  await CalendarEntry.deleteMany({ userId, outfitIds: { $size: 0 } });
};

const removeByUser = (userId) => CalendarEntry.deleteMany({ userId });

module.exports = { findByUser, upsertDay, deleteDay, removeOutfitFromAllDays, removeByUser };