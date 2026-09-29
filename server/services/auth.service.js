const bcrypt = require("bcryptjs");
const { authRepository } = require("../repositories/auth.repository");

async function registerUser({ name, role, email, password }) {
  const existingUser = await authRepository.findByEmail(email);
  if (existingUser) return { exists: true };

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await authRepository.create({ name, role, email, password: hashedPassword });
  return { exists: false, user };
}

async function authenticateUser({ email, password }) {
  const user = await authRepository.findByEmail(email);
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(password, user.password);
  return passwordMatches ? user : null;
}

module.exports = { registerUser, authenticateUser };
