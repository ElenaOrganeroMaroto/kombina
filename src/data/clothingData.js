const Clothing = require('../models/Clothing');

const findByUser = (userId) => Clothing.find({ userId });
const create = (data) => new Clothing(data).save();
const update = (id, updates) => Clothing.findByIdAndUpdate(id, updates, { new: true });
const remove = (id) => Clothing.findByIdAndDelete(id);
const removeByUser = (userId) => Clothing.deleteMany({ userId });

module.exports = { findByUser, create, update, remove, removeByUser };