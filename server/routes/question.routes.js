const express = require("express");
const controller = require("../controllers/question.controller");
const Question = require("../models/Question");

const router = express.Router();
router.post("/api/ocr/generate", controller.generateQuestionsFromDocument);
router.post("/api/questions/bulk", controller.saveQuestionsBulk);
router.post("/api/questions", controller.createQuestion);
router.get("/api/questions/:teacherId", controller.listTeacherQuestions);
router.delete("/api/questions/:id", controller.deleteQuestion);

module.exports = { router, Question };
