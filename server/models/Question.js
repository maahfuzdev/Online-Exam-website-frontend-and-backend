const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth' }, // Reference to the teacher
    questionText: String,
    subject: { type: String, trim: true, default: "" },
    class: { type: String, trim: true, default: "" },
    questionType: { type: String, enum: ["mathematical", "general"], default: "general" },
    answerType: { type: String, enum: ["mcq", "written"], default: "mcq" },
    options: [String],
    correctAnswer: String,
    createdAt: { type: Date, default: Date.now }
});

// Question model
const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
