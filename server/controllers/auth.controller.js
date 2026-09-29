const { Auth } = require("../repositories/auth.repository");
const { registerUser, authenticateUser } = require("../services/auth.service");
const asyncHandler = require("../middleware/async-handler");

async function register(req, res) {
  try {
    const result = await registerUser(req.body);
    if (result.exists) {
      return res.status(400).json({ message: "User already exists", success: false });
    }

    res.status(201).json({
      message: "Registration successful",
      success: true,
      role: result.user.role
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
}

async function login(req, res) {
  try {
    const user = await authenticateUser(req.body);
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password", success: false });
    }

    res.json({
      message: "Login successful",
      success: true,
      user: { name: user.name, email: user.email, id: user.id, role: user.role }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
}

module.exports = {
  register: asyncHandler(register),
  login: asyncHandler(login),
  Auth
};
