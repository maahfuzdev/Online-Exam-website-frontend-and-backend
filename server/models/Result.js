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

  attemptNumber: { type: Number, default: 1, min: 1 },

  totalQuestions: Number,

  score: Number,
  mcqScore: Number,
  manualMarks: { type: Number, default: 0 },
  manualGradingPending: { type: Boolean, default: false },

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
    optionLabels: [String],
    selectedOption: Number,
    correctOption: Number,
    isCorrect: Boolean,
    answerType: { type: String, enum: ["mcq", "written"], default: "mcq" },
    answerSubmitted: { type: Boolean, default: false },
    maxMarks: Number,
    marksAwarded: Number,
    teacherFeedback: { type: String, maxlength: 2000 }
  }],

  date: Date,

  generatedAt: {
    type: Date,
    default: Date.now
  }
});

resultSchema.index({ examID: 1, studentID: 1, attemptNumber: 1 }, { unique: true });


const Result = mongoose.model('Result', resultSchema);

module.exports = Result;
