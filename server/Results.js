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

  date: Date,

  generatedAt: {
    type: Date,
    default: Date.now
  }
});


const Result = mongoose.model('Result', resultSchema);

router.post("/api/studentresult", async (req, res) => {
  try {
    const {
      studentID,
      teacherID,
      examID,
      examTitle,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      skippedQuestion,
      score,
      totalMarks,
      percentage,
      timeTaken,
      date
    } = req.body;

        // Check if result already exists
  

    const newResult = new Result({
      studentID,
      teacherID,
      examID,
      examTitle,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      skippedQuestion,
      score,
      totalMarks,
      percentage,
      timeTaken,
      date
    });

    await newResult.save();

    res.status(201).json({
      success: true,
      message: "Result saved successfully",
      result: newResult
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

    const results = await Result.find({ studentID });
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

    const resultsbyExamid = await Result.find({ examID }).populate("studentID","name");
   

    
    res.json(resultsbyExamid);

  } catch (error) {
    console.error("Error fetching student result:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});




module.exports = { router, Result };