const userData = require('../data/userData');

const registerUser = (userDataObj) => {
  const existing = userData.findUserByEmail(userDataObj.email);
  if (existing) {
    throw new Error('El correo electrónico ya está registrado.');
  }
  const newUser = {
    ...userDataObj,
    isActive: userDataObj.isActive ?? false,
    role: userDataObj.role || 'user'
  };
  return userData.addUser(newUser);
};

const loginUser = (email, password) => {
  const user = userData.findUserByEmail(email);
  if (!user) {
    throw new Error('Usuario no encontrado.');
  }
  if (!user.isActive) {
    throw new Error('La cuenta está pendiente de confirmación por correo.');
  }
  if (user.password !== password) {
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

const removeAccount = (email, requesterRole, requesterEmail) => {
  if (requesterRole !== 'admin' && email !== requesterEmail) {
    throw new Error('No tienes permisos para eliminar esta cuenta.');
  }
  const deleted = userData.deleteUser(email);
  if (!deleted) {
    throw new Error('Usuario no encontrado para eliminar.');
  }
  return deleted;
};

module.exports = { registerUser, loginUser, adminActionCheck, removeAccount };