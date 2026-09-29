const express = require("express");
const controller = require("../controllers/assignment.controller");
const AssignedQuestion = require("../models/AssignedQuestion");
const { bindActor, protect } = require("../middleware/session-auth");

const router = express.Router();
router.post("/api/assigned-questions", bindActor("teacher", "body", "teacherID"), controller.createAssignedExam);
router.put("/api/assigned-questions/:examId", bindActor("teacher", "body", "teacherID"), controller.updateAssignedExam);
router.patch("/api/assigned-questions/:examId/extend", bindActor("teacher", "body", "teacherID"), controller.extendExamWindow);
router.delete("/api/assigned-questions/:examId", bindActor("teacher", "body", "teacherID"), controller.deleteAssignedExam);
router.patch("/api/assigned-questions/:examId/release-results", bindActor("teacher", "body", "teacherID"), controller.releaseExamResults);
router.get("/api/students", protect("teacher"), controller.listStudents);
router.post("/api/students", protect("teacher"), controller.createStudent);
router.put("/api/students/:studentId", protect("teacher"), controller.updateStudent);
router.get("/api/exam/:examId/student/:studentId", bindActor("student", "params", "studentId"), controller.getExamForStudent);
router.post("/api/exam/:examId/attend", bindActor("student", "body", "studentId"), controller.recordExamAttendance);
router.get("/api/exams/student/:studentId", bindActor("student", "params", "studentId"), controller.listExamsForStudent);
router.get("/api/assigned-questions/teacher/:teacherId", bindActor("teacher", "params", "teacherId"), controller.listExamsForTeacher);

module.exports = { router, AssignedQuestion };
