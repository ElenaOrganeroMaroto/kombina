const profileData = require('../data/profileData');
const { AppError } = require('./errors');

const toPublicProfile = (user) => ({
  name: user.name,
  handle: user.handle,
  bio: user.bio,
  avatar: user.avatar
});

const getProfile = async (userId) => {
  if (!userId) throw new AppError('Se requiere el ID de usuario', 400);
  const user = await profileData.findProfile(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return toPublicProfile(user);
};

const updateProfile = async (userId, { name, handle, bio, avatar }) => {
  if (!userId) throw new AppError('Se requiere el ID de usuario', 400);

  // Solo se actualizan los campos que vienen en la petición
  const updates = {};
  if (typeof name === 'string') updates.name = name.trim().slice(0, 60);
  if (typeof handle === 'string') updates.handle = handle.trim().replace(/^@/, '').slice(0, 30);
  if (typeof bio === 'string') updates.bio = bio.slice(0, 300);
  if (typeof avatar === 'string') updates.avatar = avatar;

  const user = await profileData.updateProfile(userId, updates);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return toPublicProfile(user);
};

module.exports = { getProfile, updateProfile };