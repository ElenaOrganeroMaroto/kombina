const mongoose = require('mongoose');

// Un documento por usuario y día: qué outfits están asignados a esa fecha
const calendarEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // 'AAAA-MM-DD'
  outfitIds: [{ type: String }] // ids de Outfit (como texto)
}, {
  timestamps: true
});

calendarEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CalendarEntry', calendarEntrySchema);