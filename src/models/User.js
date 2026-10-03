const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // Datos del perfil visibles en la app
  name: { type: String, default: '', trim: true },
  handle: { type: String, default: '', trim: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' } // imagen en base64 (reducida desde el cliente)
  // Puedes añadir aquí otros campos que ya tuvieras en tus objetos de usuario
}, {
  timestamps: true // Añade automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('User', userSchema);