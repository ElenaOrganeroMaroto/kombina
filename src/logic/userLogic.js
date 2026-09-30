const bcrypt = require('bcrypt');
const userData = require('../data/userData');

const registerUser = async (userDataObj) => {
  const existing = userData.findUserByEmail(userDataObj.email);
  if (existing) {
    throw new Error('El correo electrónico ya está registrado.');
  }

  // Hashear la contraseña de forma segura antes de guardarla
  const hashedPassword = await bcrypt.hash(userDataObj.password, 10);

  const newUser = {
    ...userDataObj,
    password: hashedPassword, // Guardamos el hash, NUNCA la contraseña en plano
    isActive: userDataObj.isActive ?? false, //¡¡¡¡¡¡¡ Poner a true para probarlo sin el correo!!!!!
    role: userDataObj.role || 'user'
  };
  return userData.addUser(newUser);
};

const loginUser = async (email, password) => {
  const user = userData.findUserByEmail(email);
  if (!user) {
    throw new Error('Usuario no encontrado.');
  }
  if (!user.isActive) {
    throw new Error('La cuenta está pendiente de confirmación por correo.');
  }

  // Comparar la contraseña introducida con el hash guardado en el objeto
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