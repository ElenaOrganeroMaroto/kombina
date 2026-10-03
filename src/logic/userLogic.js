const bcrypt = require('bcrypt');
const userData = require('../data/userData');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

// Datos del usuario que se pueden enseñar al navegador (nunca el hash de la contraseña)
const toPublicUser = (user) => {
  if (!user) return null;
  return { _id: user._id, email: user.email, role: user.role, isActive: user.isActive };
};

const registerUser = async (userDataObj) => {
  if (!userDataObj || !userDataObj.email || !userDataObj.password) {
    throw new Error('El correo electrónico y la contraseña son obligatorios.');
  }

  const existing = await userData.findUserByEmail(userDataObj.email);
  if (existing) {
    throw new Error('El correo electrónico ya está registrado.');
  }

  // Hashear la contraseña de forma segura antes de guardarla
  const hashedPassword = await bcrypt.hash(userDataObj.password, 10);

  const newUserObj = {
    ...userDataObj,
    password: hashedPassword,
    isActive: userDataObj.isActive ?? true, // ¡Recuerda poner true si quieres probarlo sin correo!
    role: userDataObj.role || 'user'
  };
  return await userData.addUser(newUserObj);
};

const loginUser = async (email, password) => {
  const user = await userData.findUserByEmail(email);
  if (!user) {
    throw new Error('Usuario no encontrado.');
  }
  if (!user.isActive) {
    throw new Error('La cuenta está pendiente de confirmación por correo.');
  }

  // Comparar la contraseña introducida con el hash guardado
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Contraseña incorrecta.');
  }

  return { message: 'Login exitoso', user };
};

const adminActionCheck = (userRole) => {
  if (userRole !== 'admin') {
    throw new Error('Acceso denegado: se requieren permisos de administrador.');
  }
  return true;
};

const removeAccount = async (email, requesterRole, requesterEmail) => {
  if (requesterRole !== 'admin' && normalizeEmail(email) !== normalizeEmail(requesterEmail)) {
    throw new Error('No tienes permisos para eliminar esta cuenta.');
  }
  const deleted = await userData.deleteUser(email);
  if (!deleted) {
    throw new Error('Usuario no encontrado para eliminar.');
  }
  return deleted;
};

module.exports = { registerUser, loginUser, adminActionCheck, removeAccount, toPublicUser };