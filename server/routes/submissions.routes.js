const express = require("express");
const Submission = require("../models/Submission");

const router = express.Router();

module.exports = { router, Submission };
