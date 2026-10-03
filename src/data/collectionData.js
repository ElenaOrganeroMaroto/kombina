const Collection = require('../models/Collection');

const findByUser = (userId) => Collection.find({ userId });
const create = (data) => new Collection(data).save();
const update = (id, updates) => Collection.findByIdAndUpdate(id, updates, { new: true });
const remove = (id) => Collection.findByIdAndDelete(id);
const removeByUser = (userId) => Collection.deleteMany({ userId });

module.exports = { findByUser, create, update, remove, removeByUser };