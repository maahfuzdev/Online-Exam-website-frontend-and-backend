const { Auth } = require("../repositories/auth.repository");
const { registerUser, authenticateUser } = require("../services/auth.service");
const asyncHandler = require("../middleware/async-handler");

async function register(req, res) {
  try {
    const { name, role, email, password } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password || password.length < 6 || (role === "student" && !req.body.class?.trim())) {
      return res.status(400).json({ message: "Name, email, password (at least 6 characters), and student class are required", success: false });
    }
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

    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = String(user._id);
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    res.json({
      message: "Login successful",
      success: true,
      user: { name: user.name, email: user.email, id: user.id, role: user.role, class: user.class || "" }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
}

async function currentUser(req, res) {
  if (!req.session?.userId) return res.status(401).json({ authenticated: false });
  const user = await Auth.findById(req.session.userId).select("_id name email role class");
  if (!user) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: { id: String(user._id), name: user.name, email: user.email, role: user.role, class: user.class || "" } });
}

async function logout(req, res) {
  if (!req.session) return res.json({ success: true });
  req.session.destroy(error => {
    if (error) return res.status(500).json({ error: "Could not sign out." });
    res.clearCookie("quizmaster.sid", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    res.json({ success: true });
  });
}

module.exports = {
  register: asyncHandler(register),
  login: asyncHandler(login),
  currentUser: asyncHandler(currentUser),
  logout: asyncHandler(logout),
  Auth
};
