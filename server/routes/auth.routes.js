const express = require("express");
const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authController.currentUser);
router.post("/logout", authController.logout);

module.exports = { router, Auth: authController.Auth };
