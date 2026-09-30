const mongoose = require("mongoose");
const { authRepository } = require("../repositories/auth.repository");
const { questionRepository } = require("../repositories/question.repository");
const { assignedExamRepository } = require("../repositories/assigned-exam.repository");
const Question = require("../models/Question");
const { inferQuestionType, normalizeQuestionType } = require("../services/question.service");
const { generateQuestionsFromDocument: generateQuestionsFromDocumentService } = require("../services/document-question.service");
const asyncHandler = require("../middleware/async-handler");

function getOptionLabelInfo(label) {
    const value = String(label || "").trim();
    const lower = value.toLowerCase();
    if (/^[a-d]$/.test(lower)) return { family: "latin", index: lower.charCodeAt(0) - 97 };
    const roman = { i: 0, ii: 1, iii: 2, iv: 3 };
    if (Object.prototype.hasOwnProperty.call(roman, lower)) return { family: "roman", index: roman[lower] };
    const bangla = { "\u0995": 0, "\u0996": 1, "\u0997": 2, "\u0998": 3 };
    if (Object.prototype.hasOwnProperty.call(bangla, value)) return { family: "bangla", index: bangla[value] };
    return null;
}

function isValidOptionLabels(labels) {
    if (!Array.isArray(labels) || labels.length !== 4) return false;
    const normalized = labels.map(getOptionLabelInfo);
    return normalized[0] && normalized.every((item, index) => item?.family === normalized[0].family && item.index === index);
}

async function generateQuestionsFromDocument(req, res) {
  const result = await generateQuestionsFromDocumentService(req.body);
  res.status(result.status).json(result.body);
}
async function saveQuestionsBulk(req, res) {
    try {
        const { teacherId, subject, class: questionClass, questions } = req.body;
        if (!mongoose.isValidObjectId(teacherId)) return res.status(400).json({ error: "Please sign in again as a teacher." });
        const teacher = await authRepository.findOne({ _id: teacherId, role: "teacher" }).select("_id");
        if (!teacher) return res.status(403).json({ error: "A teacher account is required." });
        if (!subject?.trim() || !questionClass?.trim() || !Array.isArray(questions) || !questions.length || questions.length > 100) {
            return res.status(400).json({ error: "Subject, class, and 1 to 100 questions are required." });
        }
        const valid = questions.every(q => {
            const optionLabels = q.optionLabels || ["A", "B", "C", "D"];
            return typeof q.questionText === "string" && q.questionText.trim() &&
                (!q.answerType || q.answerType === "mcq") &&
                Array.isArray(q.options) && q.options.length === 4 && q.options.every(option => typeof option === "string" && option.trim()) &&
                isValidOptionLabels(optionLabels) && /^[A-D]$/.test(q.correctAnswer);
        });
        if (!valid) return res.status(400).json({ error: "Each MCQ needs text, four options, and a correct answer." });
        const saved = await questionRepository.insertMany(questions.map(q => ({
            teacher: teacherId,
            questionText: q.questionText.trim(),
            options: q.options.map(option => option.trim()),
            optionLabels: q.optionLabels || ["A", "B", "C", "D"],
            correctAnswer: q.correctAnswer,
            answerType: "mcq",
            subject: subject.trim(),
            class: questionClass.trim(),
            questionType: inferQuestionType(subject, q.questionText, q.options)
        })));
        res.status(201).json({ message: "Questions saved", questions: saved });
    } catch (err) {
        console.error("Bulk question save failed:", err.message);
        res.status(500).json({ error: "Questions could not be saved." });
    }

}

async function createQuestion(req, res) {
    try {
        const { teacherId, questionText, options, correctAnswer, subject, class: questionClass, questionType, answerType = "mcq" } = req.body;

        if (!teacherId || typeof questionText !== "string" || !questionText.trim() || !["mcq", "written"].includes(answerType)) {
            return res.status(400).json({ error: "A question and valid answer type are required." });
        }
        if (answerType === "mcq" && (!Array.isArray(options) || options.length !== 4 || options.some(option => !String(option).trim()) || !/^[A-D]$/.test(correctAnswer || ""))) {
            return res.status(400).json({ error: "MCQ questions require four options and a correct answer." });
        }

        const newQuestion = new Question({
            teacher: teacherId,
            questionText,
            options: answerType === "mcq" ? options : [],
            correctAnswer: answerType === "mcq" ? correctAnswer : undefined,
            answerType,
            subject,
            class: questionClass,
            questionType: normalizeQuestionType(questionType)
        });
        await newQuestion.save();

        res.status(201).json({ message: "Question saved", question: newQuestion });
    } catch (err) {
        res.status(500).json({ error: "Error saving question" });
    }

}

async function listTeacherQuestions(req, res) {
    try {
        const questions = await questionRepository.find({ teacher: req.params.teacherId }).sort({ createdAt: -1 });
      res.json(questions);
      console.log("Fetched questions:", questions);
    } catch (err) {
        res.status(500).json({ error: "Error fetching questions" });
    }

}

async function deleteQuestion(req, res) {
    try {
        const { teacherId } = req.body || {};
        if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(teacherId)) {
            return res.status(400).json({ error: "A valid question and teacher account are required." });
        }
        const teacher = await authRepository.findOne({ _id: teacherId, role: "teacher" }).select("_id");
        if (!teacher) return res.status(403).json({ error: "A teacher account is required." });

        // Keep questions attached to exams intact so existing exams remain usable.
        const isAssigned = await assignedExamRepository.exists({ questionIds: req.params.id });
        if (isAssigned) {
            return res.status(409).json({ error: "This question is used in an exam and cannot be deleted." });
        }

        const result = await questionRepository.findOneAndDelete({ _id: req.params.id, teacher: teacherId });

        if (!result) return res.status(404).json({ error: "Question not found in your question bank." });

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting question" });
    }

}

module.exports = {
  generateQuestionsFromDocument: asyncHandler(generateQuestionsFromDocument),
  saveQuestionsBulk: asyncHandler(saveQuestionsBulk),
  createQuestion: asyncHandler(createQuestion),
  listTeacherQuestions: asyncHandler(listTeacherQuestions),
  deleteQuestion: asyncHandler(deleteQuestion)
};
