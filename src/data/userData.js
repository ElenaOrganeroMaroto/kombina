const User = require('../models/User');

const getUsers = async () => {
  return await User.find().select('email role isActive');
};

const addUser = async (userDataObj) => {
  const newUser = new User(userDataObj);
  return await newUser.save();
};

// Los emails se guardan en minúsculas y sin espacios, así que se buscan igual
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const findUserByEmail = async (email) => {
  return await User.findOne({ email: normalizeEmail(email) });
};

const findUserById = async (userId) => {
  return await User.findById(userId);
};

const findUserByGoogleId = async (googleId) => {
  return await User.findOne({ googleId });
};

const activateUserByEmailToken = async (tokenHash) => {
  return await User.findOneAndUpdate(
    {
      emailConfirmationTokenHash: tokenHash,
      emailConfirmationExpiresAt: { $gt: new Date() },
      isActive: false
    },
    {
      $set: { isActive: true },
      $unset: { emailConfirmationTokenHash: 1, emailConfirmationExpiresAt: 1 }
    },
    { returnDocument: 'after' }
  );
};

const incrementSessionVersion = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    { $inc: { sessionVersion: 1 } },
    { returnDocument: 'after' }
  );
};

const deleteUser = async (email) => {
  return await User.findOneAndDelete({ email: normalizeEmail(email) });
};

const clearUsers = async () => {
  if (process.env.NODE_ENV === 'test') {
    await User.deleteMany({});
  }
};

module.exports = {
  getUsers,
  addUser,
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  activateUserByEmailToken,
  incrementSessionVersion,
  deleteUser,
  clearUsers
};