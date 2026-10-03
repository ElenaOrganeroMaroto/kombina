const mongoose = require('mongoose');

const clothingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true }, // Guardaremos la imagen en base64 o su ruta
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Relación con el usuario propietario
}, {
  timestamps: true
});

module.exports = mongoose.model('Clothing', clothingSchema);