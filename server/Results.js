const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

//Result Schema

const resultSchema = new mongoose.Schema({
  studentID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auth",
    required: true
  },

  teacherID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auth"
  },

  examID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssignedQuestion",
    required: true
  },

  examTitle: {
    type: String
  },

  totalQuestions: Number,

  score: Number,

  totalMarks: Number,

  correctAnswers: Number,

  wrongAnswers: Number,
  skippedQuestion:Number,

  percentage: Number,

  timeTaken: Number,

  answerReview: [{
    questionID: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    questionText: String,
    options: [String],
    selectedOption: Number,
    correctOption: Number,
    isCorrect: Boolean
  }],

  date: Date,

  generatedAt: {
    type: Date,
    default: Date.now
  }
});


const Result = mongoose.model('Result', resultSchema);

async function findAssignedExam(examID) {
  const { AssignedQuestion } = require("./AssignedQuestions");
  return AssignedQuestion.findById(examID).select("endTime resultVisibility resultsReleased teacherID");
}

function canStudentViewResult(exam) {
  if (!exam) return true; // Keep legacy results visible if their exam record no longer exists.
  const policy = exam.resultVisibility || "immediate";
  if (policy === "after_exam_end") return new Date() >= new Date(exam.endTime);
  if (policy === "teacher_release") return Boolean(exam.resultsReleased);
  return true;
}

async function visibleResultsForStudent(results) {
  const { AssignedQuestion } = require("./AssignedQuestions");
  const examIDs = [...new Set(results.map(result => String(result.examID)).filter(Boolean))];
  const exams = await AssignedQuestion.find({ _id: { $in: examIDs } }).select("endTime resultVisibility resultsReleased");
  const examById = new Map(exams.map(exam => [String(exam._id), exam]));
  return results.filter(result => canStudentViewResult(examById.get(String(result.examID))));
}

router.post("/api/studentresult", async (req, res) => {
  try {
    const { studentID, examID, timeTaken, answers } = req.body;

        const { AssignedQuestion } = require("./AssignedQuestions");
        const exam = await AssignedQuestion.findOne({ _id: examID, studentIDs: studentID }).populate("questionIds");
        if (!exam) return res.status(403).json({ success: false, message: "You are not assigned to this exam." });

        // Check if result already exists
    const existingResult = await Result.findOne({ studentID, examID });
    if (existingResult) {
      const visible = canStudentViewResult(exam);
      return res.status(200).json({
        success: true,
        submitted: true,
        message: "This exam has already been submitted.",
        result: visible ? existingResult : null,
        resultVisibility: exam.resultVisibility || "immediate",
        resultsReleased: Boolean(exam.resultsReleased)
      });
    }

    if (!exam.attendedStudentIDs.some(id => String(id) === String(studentID))) {
      return res.status(403).json({ success: false, message: "Exam attendance was not recorded. Reopen the exam and submit again." });
    }
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "Exam answers are missing." });
    }
    const invalidAnswer = Object.entries(answers).some(([index, value]) =>
      !/^\d+$/.test(index) || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 3
    );
    if (invalidAnswer) return res.status(400).json({ success: false, message: "One or more submitted answers are invalid." });

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const answerReview = exam.questionIds.map((question, index) => {
      const rawAnswer = answers[index];
      const selectedOption = rawAnswer === undefined || rawAnswer === null || rawAnswer === "" ? null : Number(rawAnswer);
      const correctOption = String(question.correctAnswer || "A").toUpperCase().charCodeAt(0) - 65;
      const isCorrect = selectedOption !== null && selectedOption === correctOption;
      if (selectedOption === null) skippedCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;
      return {
        questionID: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedOption,
        correctOption,
        isCorrect
      };
    });
    const questionMark = Number(exam.markPerQuestion) || 0;
    const penalty = exam.negativeMarkingEnabled ? Number(exam.negativeMarkPerWrong) || 0 : 0;
    const totalMarks = questionMark * answerReview.length;
    const score = Math.max(0, correctCount * questionMark - wrongCount * penalty);
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    const newResult = new Result({
      studentID,
      teacherID: exam.teacherID,
      examID,
      examTitle: exam.examTitle,
      totalQuestions: answerReview.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      skippedQuestion: skippedCount,
      score,
      totalMarks,
      percentage,
      timeTaken,
      date: new Date(),
      answerReview
    });

    await newResult.save();

    const visible = canStudentViewResult(exam);

    res.status(201).json({
      success: true,
      submitted: true,
      message: visible ? "Result saved successfully" : "Your submission is saved. The teacher's release rule will determine when you can see your result.",
      result: visible ? newResult : null,
      resultVisibility: exam.resultVisibility || "immediate",
      resultsReleased: Boolean(exam.resultsReleased)
    });

  }
  catch (error) {
    console.error("Error saving result:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

router.get("/api/studentsResult/:studentID", async (req, res) => {
  try {
    const { studentID } = req.params;

    const allResults = await Result.find({ studentID });
    const results = await visibleResultsForStudent(allResults);
    let totalResult = results.length;
    let totalObtainMarks = 0;
    let totalExamMarks = 0;
    results.forEach(result => {
      totalObtainMarks = totalObtainMarks + result.score;
      totalExamMarks = totalExamMarks + result.totalMarks;
    }
    );
    const averagePercentage = Math.round((totalObtainMarks / totalExamMarks)*100);




    console.log("student result:", results);

    res.status(200).json({
      success: true,
      count: results.length,
      averagePercentage: averagePercentage || 0,
      data: results
    });

  } catch (error) {
    console.error("Error fetching student result:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});


//student result with examId and studentID

router.get("/api/studentsResult/:studentID/examID/:examID", async (req, res) => {
  try {
    const { studentID, examID } = req.params;

    const results = await Result.find({ studentID, examID });
    const exam = await findAssignedExam(examID);
    if (!canStudentViewResult(exam)) {
      return res.status(403).json({ success: false, message: "The teacher has not released this result yet.", count: 0, data: [] });
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error("Error fetching student exam result:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});







router.get("/api/studentsResultbyExamID/:examID", async (req, res) => {
  try {
    const { examID } = req.params;
    const exam = await findAssignedExam(examID);
    if (!exam) return res.status(404).json({ error: "Exam not found." });
    if (!canStudentViewResult(exam)) return res.status(403).json({ error: "Results are not available yet." });
    const results = await Result.find({ examID }).populate("studentID", "name");
    res.json(results);
  } catch (error) {
    console.error("Error fetching student result:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

router.get("/api/teacherResults/:teacherID", async (req, res) => {
  try {
    const results = await Result.find({ teacherID: req.params.teacherID })
      .populate("studentID", "name class")
      .populate("examID", "subject")
      .sort({ generatedAt: -1 });

    res.json(results.map(result => {
      const percentage = result.percentage ?? (
        result.totalMarks ? (result.score / result.totalMarks) * 100 : 0
      );

      return {
        id: result._id,
        studentId: result.studentID?._id,
        studentName: result.studentID?.name || "Unknown student",
        class: result.studentID?.class || "",
        examId: result.examID?._id || result.examID,
        examTitle: result.examTitle || "Exam",
        subject: result.examID?.subject || "",
        score: result.score ?? 0,
        total: result.totalMarks ?? 0,
        percentage,
        grade: percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F",
        date: result.date || result.generatedAt
      };
    }));
  } catch (error) {
    console.error("Error fetching teacher results:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




module.exports = { router, Result };
