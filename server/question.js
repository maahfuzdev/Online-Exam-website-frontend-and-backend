const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


// question Schema

const questionSchema = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth' }, // Reference to the teacher
    questionText: String,
    options: [String],
    correctAnswer: String,
    createdAt: { type: Date, default: Date.now }
});

// Question model
const Question = mongoose.model("Question", questionSchema);

// Create question
router.post("/api/questions", async (req, res) => {
    try {
        const { teacherId, questionText, options, correctAnswer } = req.body;

        if (!questionText || !options || options.length !== 4 || !correctAnswer) {
            return res.status(400).json({ error: "Invalid data" });
        }

        const newQuestion = new Question({teacher: teacherId, questionText, options, correctAnswer });
        await newQuestion.save();

        res.status(201).json({ message: "Question saved", question: newQuestion });
    } catch (err) {
        res.status(500).json({ error: "Error saving question" });
    }
});

// Get all questions
router.get("/api/questions/:teacherId", async (req, res) => {
    try {
        const questions = await Question.find({ teacher: req.params.teacherId }).sort({ createdAt: -1 });
      res.json(questions);
      console.log("Fetched questions:", questions);
    } catch (err) {
        res.status(500).json({ error: "Error fetching questions" });
    }
});

// Delete question
router.delete("/api/questions/:id", async (req, res) => {
    try {
        const result = await Question.findByIdAndDelete(req.params.id);

        if (!result) return res.status(404).json({ error: "Not found" });

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting question" });
    }
});



module.exports = { router, Question };
