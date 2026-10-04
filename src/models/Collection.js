const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  outfits: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Outfit' 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Collection', collectionSchema);