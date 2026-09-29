const express = require("express");
const controller = require("../controllers/result.controller");
const Result = require("../models/Result");

const router = express.Router();
router.post("/api/studentresult", controller.submitStudentResult);
router.get("/api/studentsResult/:studentID", controller.listStudentResults);
router.get("/api/studentsResult/:studentID/examID/:examID", controller.getStudentExamResult);
router.get("/api/studentsResultbyExamID/:examID", controller.listResultsByExam);
router.get("/api/teacherResults/:teacherID", controller.listTeacherResults);

module.exports = { router, Result };
