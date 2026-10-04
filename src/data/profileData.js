const User = require('../models/User');

const PROFILE_FIELDS = 'name handle bio avatar';

const findProfile = (userId) => User.findById(userId).select(PROFILE_FIELDS);
const updateProfile = (userId, updates) =>
  User.findByIdAndUpdate(userId, updates, { new: true }).select(PROFILE_FIELDS);

module.exports = { findProfile, updateProfile };