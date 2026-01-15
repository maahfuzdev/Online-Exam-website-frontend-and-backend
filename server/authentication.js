const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Auth Schema
const AuthSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], default: 'student' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Auth = mongoose.model('Auth', AuthSchema);


//   REGISTRATION ROUTE
// ===========================
router.post('/register', async (req, res) => {
  try {
    const { name, role, email, password } = req.body;

    // Check existing account
    const exists = await Auth.findOne({ email });
    if (exists) {
      return res.status(400).json({
        message: 'User already exists',
        success: false
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new Auth({
      name,
      role,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // Return success + role
    res.status(201).json({
      message: 'Registration successful',
      success: true,
      role: newUser.role
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({
      message: 'Server error',
      success: false
    });
  }
});



// ===========================
//   LOGIN ROUTE
// ===========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await Auth.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'Invalid email or password',
        success: false
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid email or password',
        success: false
      });
    }

    // Success login
    res.json({
      message: 'Login successful',
      success: true,
      
      user: {
        name: user.name,
        email: user.email,
        id: user.id,
        role: user.role
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({
      message: 'Server error',
      success: false
    });
  }
});






module.exports = { router, Auth};
