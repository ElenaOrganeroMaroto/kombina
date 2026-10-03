const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  items: { type: Array, required: true }, // Lista de prendas que forman el outfit
  collectionId: { type: String, default: null }, // ID de la colección a la que pertenece (si tiene)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Relación con el usuario
}, {
  timestamps: true
});

module.exports = mongoose.model('Outfit', outfitSchema);