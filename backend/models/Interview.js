const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  position: {
    type: String,
    required: true
  },
  experience: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    default: '15 mins'
  },
  isStart: {
    type: Boolean,
    default: false
  },
  currentStageIndex: {
    type: Number,
    default: -1
  },
  lastAskedQuestion: {
    type: String,
    default: ''
  },
  chatTranscript: [{
    role: String,
    message: String,
    timestamp: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
