const mongoose = require('mongoose');

const AuthSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], default: 'student' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  class: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Auth = mongoose.model('Auth', AuthSchema);

module.exports = Auth;
