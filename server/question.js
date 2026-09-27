const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Auth } = require('./authentication');


// question Schema

const questionSchema = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth' }, // Reference to the teacher
    questionText: String,
    subject: { type: String, trim: true, default: "" },
    class: { type: String, trim: true, default: "" },
    questionType: { type: String, enum: ["mathematical", "general"], default: "general" },
    options: [String],
    correctAnswer: String,
    createdAt: { type: Date, default: Date.now }
});

// Question model
const Question = mongoose.model("Question", questionSchema);

// Create questions from PDF text or an uploaded PDF/image via Gemini. Keep the API key server-side.
router.post("/api/ocr/generate", async (req, res) => {
    try {
        const { teacherId, text, file, subject, class: questionClass, language = "English", count = 10 } = req.body;
        if (!mongoose.isValidObjectId(teacherId)) return res.status(400).json({ error: "Please sign in again as a teacher." });
        const teacher = await Auth.findOne({ _id: teacherId, role: "teacher" }).select("_id");
        if (!teacher) return res.status(403).json({ error: "A teacher account is required." });
        if (!subject?.trim() || !questionClass?.trim()) return res.status(400).json({ error: "Subject and class are required." });
        if (![5, 10, 15, 20].includes(Number(count))) return res.status(400).json({ error: "Choose between 5 and 20 questions." });
        if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "AI question generation is not configured. Add GEMINI_API_KEY to server/.env." });

        const parts = [{ text: `Create exactly ${Number(count)} original multiple-choice questions based only on the provided study material. Language: ${language}. Each question must have four plausible options, exactly one correct answer, and age-appropriate wording. Preserve mathematical notation clearly. Return only JSON matching {"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"A"}]}. The correctAnswer must be A, B, C, or D. Do not invent facts beyond the source.` }];
        if (typeof text === "string" && text.trim()) {
            parts.push({ text: `Study material:\n${text.slice(0, 30000)}` });
        } else if (file && typeof file.data === "string") {
            const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
            const base64 = file.data.replace(/^data:[^,]+,/, "");
            if (!allowed.has(file.mimeType) || base64.length > 14_000_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
                return res.status(400).json({ error: "Upload a PDF or image smaller than 10 MB." });
            }
            parts.push({ inline_data: { mime_type: file.mimeType, data: base64 } });
        } else {
            return res.status(400).json({ error: "The uploaded document did not contain readable content. Try a clearer PDF or image." });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.35,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: { questions: { type: "ARRAY", items: { type: "OBJECT", properties: {
                            question: { type: "STRING" },
                            options: { type: "ARRAY", items: { type: "STRING" } },
                            correctAnswer: { type: "STRING", enum: ["A", "B", "C", "D"] }
                        }, required: ["question", "options", "correctAnswer"] } } },
                        required: ["questions"]
                    }
                }
            }),
            signal: AbortSignal.timeout(120000)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error("Gemini generation error:", response.status, payload.error?.message || "Unknown provider error");
            const status = response.status === 429 ? 429 : response.status === 400 ? 422 : 502;
            return res.status(status).json({ error: response.status === 429 ? "AI service is busy. Please wait a moment and try again." : "AI could not process this file. Try a clearer or shorter document." });
        }
        const responseText = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("");
        const questions = JSON.parse(responseText || "{}").questions;
        const validQuestions = Array.isArray(questions) ? questions.filter(q =>
            typeof q.question === "string" && q.question.trim() &&
            Array.isArray(q.options) && q.options.length === 4 && q.options.every(option => typeof option === "string" && option.trim()) &&
            ["A", "B", "C", "D"].includes(q.correctAnswer)
        ).slice(0, Number(count)) : [];
        if (!validQuestions.length) return res.status(502).json({ error: "No valid questions could be created. Try another source document." });
        res.json({ questions: validQuestions, subject: subject.trim(), class: questionClass.trim() });
    } catch (err) {
        console.error("OCR question generation failed:", err.message);
        res.status(502).json({ error: "Question generation failed. Please try again." });
    }
});

// Save a reviewed set of generated questions as one database operation.
router.post("/api/questions/bulk", async (req, res) => {
    try {
        const { teacherId, subject, class: questionClass, questions } = req.body;
        if (!mongoose.isValidObjectId(teacherId)) return res.status(400).json({ error: "Please sign in again as a teacher." });
        const teacher = await Auth.findOne({ _id: teacherId, role: "teacher" }).select("_id");
        if (!teacher) return res.status(403).json({ error: "A teacher account is required." });
        if (!subject?.trim() || !questionClass?.trim() || !Array.isArray(questions) || !questions.length || questions.length > 20) {
            return res.status(400).json({ error: "Subject, class, and 1 to 20 questions are required." });
        }
        const valid = questions.every(q => typeof q.questionText === "string" && q.questionText.trim() && Array.isArray(q.options) && q.options.length === 4 && q.options.every(option => typeof option === "string" && option.trim()) && /^[A-D]$/.test(q.correctAnswer));
        if (!valid) return res.status(400).json({ error: "Each question needs text, four options, and a correct answer." });
        const saved = await Question.insertMany(questions.map(q => ({
            teacher: teacherId,
            questionText: q.questionText.trim(),
            options: q.options.map(option => option.trim()),
            correctAnswer: q.correctAnswer,
            subject: subject.trim(),
            class: questionClass.trim(),
            questionType: /math|algebra|geometry/i.test(subject) || [...q.questionText, ...q.options.join(" ")].some(char => /[=+×÷√∑∫^]/.test(char)) ? "mathematical" : "general"
        })));
        res.status(201).json({ message: "Questions saved", questions: saved });
    } catch (err) {
        console.error("Bulk question save failed:", err.message);
        res.status(500).json({ error: "Questions could not be saved." });
    }
});

// Create question
router.post("/api/questions", async (req, res) => {
    try {
        const { teacherId, questionText, options, correctAnswer, subject, class: questionClass, questionType } = req.body;

        if (!questionText || !options || options.length !== 4 || !correctAnswer) {
            return res.status(400).json({ error: "Invalid data" });
        }

        const newQuestion = new Question({
            teacher: teacherId,
            questionText,
            options,
            correctAnswer,
            subject,
            class: questionClass,
            questionType: questionType === "mathematical" ? "mathematical" : "general"
        });
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
        const { teacherId } = req.body || {};
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(teacherId)) {
            return res.status(400).json({ error: "A valid question and teacher account are required." });
        }
        const teacher = await Auth.findOne({ _id: teacherId, role: "teacher" }).select("_id");
        if (!teacher) return res.status(403).json({ error: "A teacher account is required." });

        // Keep questions attached to exams intact so existing exams remain usable.
        const { AssignedQuestion } = require("./AssignedQuestions");
        const isAssigned = await AssignedQuestion.exists({ questionIds: req.params.id });
        if (isAssigned) {
            return res.status(409).json({ error: "This question is used in an exam and cannot be deleted." });
        }

        const result = await Question.findOneAndDelete({ _id: req.params.id, teacher: teacherId });

        if (!result) return res.status(404).json({ error: "Question not found in your question bank." });

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting question" });
    }
});



module.exports = { router, Question };
