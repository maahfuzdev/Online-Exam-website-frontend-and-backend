const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//submission Schema

const SubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  givenAnswer: { type: Number, required: true }, // index
  isCorrect: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now }
});
const Submission = mongoose.model('Submission', SubmissionSchema);

module.exports = { router, Submission };