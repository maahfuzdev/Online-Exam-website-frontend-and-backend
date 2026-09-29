const { resultRepository } = require("../repositories/result.repository");
const { assignedExamRepository } = require("../repositories/assigned-exam.repository");
const Result = require("../models/Result");
const { findAssignedExam, canStudentViewResult, visibleResultsForStudent } = require("../services/result-visibility.service");
const { scoreExamAnswers } = require("../services/result-scoring.service");
const asyncHandler = require("../middleware/async-handler");

async function submitStudentResult(req, res) {
  try {
    const { studentID, examID, timeTaken, answers } = req.body;

        const exam = await assignedExamRepository.findOne({ _id: examID, studentIDs: studentID }).populate("questionIds");
        if (!exam) return res.status(403).json({ success: false, message: "You are not assigned to this exam." });

        // Check if result already exists
    const existingResult = await resultRepository.findOne({ studentID, examID });
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

    const scoring = scoreExamAnswers(exam.questionIds, answers, exam);
    const { answerReview, correctCount, wrongCount, skippedCount, score, totalMarks, percentage } = scoring;

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

}

async function listStudentResults(req, res) {
  try {
    const { studentID } = req.params;

    const allResults = await resultRepository.find({ studentID });
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

}

async function getStudentExamResult(req, res) {
  try {
    const { studentID, examID } = req.params;

    const results = await resultRepository.find({ studentID, examID });
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

}

async function listResultsByExam(req, res) {
  try {
    const { examID } = req.params;
    const exam = await findAssignedExam(examID);
    if (!exam) return res.status(404).json({ error: "Exam not found." });
    if (!canStudentViewResult(exam)) return res.status(403).json({ error: "Results are not available yet." });
    const results = await resultRepository.find({ examID }).populate("studentID", "name");
    res.json(results);
  } catch (error) {
    console.error("Error fetching student result:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }

}

async function listTeacherResults(req, res) {
  try {
    const results = await resultRepository.find({ teacherID: req.params.teacherID })
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

}

module.exports = {
  submitStudentResult: asyncHandler(submitStudentResult),
  listStudentResults: asyncHandler(listStudentResults),
  getStudentExamResult: asyncHandler(getStudentExamResult),
  listResultsByExam: asyncHandler(listResultsByExam),
  listTeacherResults: asyncHandler(listTeacherResults)
};
