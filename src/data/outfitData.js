const Outfit = require('../models/Outfit');

const findByUser = (userId) => Outfit.find({ userId });
const create = (data) => new Outfit(data).save();
const update = (id, updates) => Outfit.findByIdAndUpdate(id, updates, { new: true });
const remove = (id) => Outfit.findByIdAndDelete(id);
const removeByUser = (userId) => Outfit.deleteMany({ userId });

module.exports = { findByUser, create, update, remove, removeByUser };