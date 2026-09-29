const express = require("express");
const controller = require("../controllers/assignment.controller");
const AssignedQuestion = require("../models/AssignedQuestion");

const router = express.Router();
router.post("/api/assigned-questions", controller.createAssignedExam);
router.put("/api/assigned-questions/:examId", controller.updateAssignedExam);
router.patch("/api/assigned-questions/:examId/extend", controller.extendExamWindow);
router.delete("/api/assigned-questions/:examId", controller.deleteAssignedExam);
router.patch("/api/assigned-questions/:examId/release-results", controller.releaseExamResults);
router.get("/api/students", controller.listStudents);
router.post("/api/students", controller.createStudent);
router.put("/api/students/:studentId", controller.updateStudent);
router.get("/api/exam/:examId/student/:studentId", controller.getExamForStudent);
router.post("/api/exam/:examId/attend", controller.recordExamAttendance);
router.get("/api/exams/student/:studentId", controller.listExamsForStudent);
router.get("/api/assigned-questions/teacher/:teacherId", controller.listExamsForTeacher);

module.exports = { router, AssignedQuestion };
