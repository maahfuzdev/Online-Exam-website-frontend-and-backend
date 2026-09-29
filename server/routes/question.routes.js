const express = require("express");
const controller = require("../controllers/question.controller");
const Question = require("../models/Question");
const { bindActor } = require("../middleware/session-auth");

const router = express.Router();
router.post("/api/ocr/generate", bindActor("teacher", "body", "teacherId"), controller.generateQuestionsFromDocument);
router.post("/api/questions/bulk", bindActor("teacher", "body", "teacherId"), controller.saveQuestionsBulk);
router.post("/api/questions", bindActor("teacher", "body", "teacherId"), controller.createQuestion);
router.get("/api/questions/:teacherId", bindActor("teacher", "params", "teacherId"), controller.listTeacherQuestions);
router.delete("/api/questions/:id", bindActor("teacher", "body", "teacherId"), controller.deleteQuestion);

module.exports = { router, Question };
