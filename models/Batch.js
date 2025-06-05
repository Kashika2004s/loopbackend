const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  ingestion_id: {
    type: String,
    required: true,
  },
  batch_id: {
    type: String,
    required: true,
    unique: true,
  },
  ids: [{
    type: Number,
    required: true,
  }],
  status: {
    type: String,
    enum: ['yet_to_start', 'triggered', 'completed'],
    default: 'yet_to_start',
  }
});

module.exports = mongoose.model('Batch', batchSchema);
