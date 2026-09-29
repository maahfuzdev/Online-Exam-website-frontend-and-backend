const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  studentID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auth",
    required: true
  },

  teacherID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auth"
  },

  examID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssignedQuestion",
    required: true
  },

  examTitle: {
    type: String
  },

  totalQuestions: Number,

  score: Number,

  totalMarks: Number,

  correctAnswers: Number,

  wrongAnswers: Number,
  skippedQuestion:Number,

  percentage: Number,

  timeTaken: Number,

  answerReview: [{
    questionID: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    questionText: String,
    options: [String],
    selectedOption: Number,
    correctOption: Number,
    isCorrect: Boolean
  }],

  date: Date,

  generatedAt: {
    type: Date,
    default: Date.now
  }
});


const Result = mongoose.model('Result', resultSchema);

module.exports = Result;
