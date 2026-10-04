const User = require('../models/User');

const getUsers = async () => {
  return await User.find();
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

const deleteUser = async (email) => {
  return await User.findOneAndDelete({ email: normalizeEmail(email) });
};

const clearUsers = async () => {
  if (process.env.NODE_ENV === 'test') {
    await User.deleteMany({});
  }
};

module.exports = { getUsers, addUser, findUserByEmail, deleteUser, clearUsers };