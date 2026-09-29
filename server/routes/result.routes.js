const express = require("express");
const controller = require("../controllers/result.controller");
const Result = require("../models/Result");
const { bindActor, protect } = require("../middleware/session-auth");

const router = express.Router();
router.post("/api/studentresult", bindActor("student", "body", "studentID"), controller.submitStudentResult);
router.post("/api/written-answers", bindActor("student", "body", "studentID"), controller.saveWrittenAnswer);
router.get("/api/written-answers/:examID/:studentID", bindActor("teacher", "query", "teacherID"), controller.listWrittenAnswersForTeacher);
router.patch("/api/written-answers/:examID/:studentID/:questionID/grade", bindActor("teacher", "query", "teacherID"), controller.gradeWrittenAnswer);
router.get("/api/written-answers/:examID/:studentID/:questionID/file", bindActor("teacher", "query", "teacherID"), controller.getWrittenAnswerFile);
router.get("/api/studentsResult/:studentID", bindActor("student", "params", "studentID"), controller.listStudentResults);
router.get("/api/studentsResult/:studentID/examID/:examID", bindActor("student", "params", "studentID"), controller.getStudentExamResult);
router.get("/api/studentsResultbyExamID/:examID", protect("teacher"), controller.listResultsByExam);
router.get("/api/teacherResults/:teacherID", bindActor("teacher", "params", "teacherID"), controller.listTeacherResults);

module.exports = { router, Result };
