const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  degree: {
    type: String,
    default: ''
  },
  collegeName: {
    type: String,
    default: ''
  },
  graduationYear: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  targetRole: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  linkedinUrl: {
    type: String,
    default: ''
  },
  githubUrl: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
