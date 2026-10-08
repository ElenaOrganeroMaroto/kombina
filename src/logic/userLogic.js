const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userData = require('../data/userData');
const { createSessionToken } = require('./sessionToken');
const { sendConfirmationEmail } = require('../services/emailService');

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
  const confirmationToken = crypto.randomBytes(32).toString('hex');

  const newUserObj = {
    email: normalizeEmail(userDataObj.email),
    password: hashedPassword,
    isActive: false,
    role: 'user',
    authProviders: ['local'],
    emailConfirmationTokenHash: crypto.createHash('sha256').update(confirmationToken).digest('hex'),
    emailConfirmationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
  const newUser = await userData.addUser(newUserObj);
  try {
    await sendConfirmationEmail(newUser.email, confirmationToken);
  } catch (error) {
    await userData.deleteUser(newUser.email);
    throw error;
  }
  return newUser;
};

const confirmEmail = async (token) => {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new Error('El enlace de confirmación no es válido o ha caducado.');
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await userData.activateUserByEmailToken(tokenHash);
  if (!user) throw new Error('El enlace de confirmación no es válido o ha caducado.');
  return user;
};

const resendConfirmation = async (email) => {
  const user = await userData.findUserByEmail(email);
  if (!user || user.isActive || !(user.authProviders || ['local']).includes('local')) {
    return { message: 'Si existe una cuenta pendiente para ese correo, enviaremos un enlace.' };
  }

  const confirmationToken = crypto.randomBytes(32).toString('hex');
  user.emailConfirmationTokenHash = crypto.createHash('sha256').update(confirmationToken).digest('hex');
  user.emailConfirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  await sendConfirmationEmail(user.email, confirmationToken);
  return { message: 'Si existe una cuenta pendiente para ese correo, enviaremos un enlace.' };
};

const loginUser = async (email, password) => {
  const user = await userData.findUserByEmail(email);
  if (!user) {
    throw new Error('Usuario no encontrado.');
  }
  if (!user.password) {
    throw new Error('Esta cuenta se creó con Google. Inicia sesión con ese proveedor.');
  }
  if (!user.isActive) {
    throw new Error('La cuenta está pendiente de confirmación por correo.');
  }

  // Comparar la contraseña introducida con el hash guardado
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Contraseña incorrecta.');
  }

  return {
    message: 'Login exitoso',
    user,
    token: createSessionToken(user._id, user.sessionVersion || 0)
  };
};

const loginWithGoogle = async (googleProfile) => {
  if (!googleProfile || !googleProfile.sub || !googleProfile.email || googleProfile.email_verified !== true) {
    throw new Error('Google no ha verificado la identidad y el correo de esta cuenta.');
  }

  const email = normalizeEmail(googleProfile.email);
  let user = await userData.findUserByGoogleId(googleProfile.sub);
  if (!user) user = await userData.findUserByEmail(email);

  if (user) {
    if (user.googleId && user.googleId !== googleProfile.sub) {
      throw new Error('Este correo ya está vinculado a otra cuenta de Google.');
    }
    user.googleId = googleProfile.sub;
    user.isActive = true;
    user.authProviders = [...new Set([...(user.authProviders || ['local']), 'google'])];
    user.emailConfirmationTokenHash = undefined;
    user.emailConfirmationExpiresAt = undefined;
    if (!user.name && googleProfile.name) user.name = googleProfile.name;
    await user.save();
  } else {
    user = await userData.addUser({
      email,
      googleId: googleProfile.sub,
      authProviders: ['google'],
      name: googleProfile.name || '',
      isActive: true,
      role: 'user'
    });
  }

  return {
    message: 'Login con Google exitoso',
    user,
    token: createSessionToken(user._id, user.sessionVersion || 0)
  };
};

const listUsers = async () => {
  const users = await userData.getUsers();
  return users.map(toPublicUser);
};

const getUserStatus = async (userId) => {
  const user = await userData.findUserById(userId);
  return { userId, isActive: Boolean(user && user.isActive) };
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

module.exports = {
  registerUser,
  confirmEmail,
  resendConfirmation,
  loginUser,
  loginWithGoogle,
  listUsers,
  getUserStatus,
  adminActionCheck,
  removeAccount,
  toPublicUser
};