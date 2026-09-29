const express = require("express");
const controller = require("../controllers/result.controller");
const Result = require("../models/Result");

const router = express.Router();
router.post("/api/studentresult", controller.submitStudentResult);
router.post("/api/written-answers", controller.saveWrittenAnswer);
router.get("/api/written-answers/:examID/:studentID", controller.listWrittenAnswersForTeacher);
router.patch("/api/written-answers/:examID/:studentID/:questionID/grade", controller.gradeWrittenAnswer);
router.get("/api/written-answers/:examID/:studentID/:questionID/file", controller.getWrittenAnswerFile);
router.get("/api/studentsResult/:studentID", controller.listStudentResults);
router.get("/api/studentsResult/:studentID/examID/:examID", controller.getStudentExamResult);
router.get("/api/studentsResultbyExamID/:examID", controller.listResultsByExam);
router.get("/api/teacherResults/:teacherID", controller.listTeacherResults);

module.exports = { router, Result };
