// assignedQuestions.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Auth: Auth } = require('./authentication'); // User model
const { Question: Question } = require('./question'); // Question model

// AssignedQuestions Schema
const AssignedSchema = new mongoose.Schema({
 teacherID: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth' }, // Reference to the teacher
   studentIDs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Auth' }], // Reference to the students
   examTitle: String,
   subject: { type: String, trim: true, default: "" },
   questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
   startTime: Date,
  endTime: Date,
   examTime: Number, // in minutes
   markPerQuestion: Number,
   totalMarks: Number,
   createdAt: { type: Date, default: Date.now }
 });

const AssignedQuestion = mongoose.model('AssignedQuestion', AssignedSchema);

// POST: Assign questions
router.post("/api/assigned-questions", async (req, res) => {
  try {
    const { teacherID, studentIDs, examTitle, subject, questionIds, startTime, endTime, examTime, markPerQuestion, totalMarks } = req.body;

 if (!teacherID || !studentIDs || !examTitle || !questionIds || questionIds.length === 0 || !startTime || !endTime || !markPerQuestion || !examTime) {
      return res.status(400).json({ error: "Teacher, Students, Questions, Start Time, End Time and Exam Time are required" });
    }

    
    const newAssignment = new AssignedQuestion({
      teacherID, studentIDs, examTitle, subject, questionIds, startTime, endTime, examTime, markPerQuestion, totalMarks
    });
    await newAssignment.save();

    res.status(201).json({ message: "Questions assigned successfully", assignment: newAssignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error assigning questions" });
  }
});

// GET: All students (for frontend selection)
router.get("/api/students", async (req, res) => {
  try {
    const students = await Auth.find(
      { role: "student" },
      { _id: 1, name: 1, email: 1, class: 1 }
    ).sort({ name: 1 });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching students" });
  }
});

router.post("/api/students", async (req, res) => {
  try {
    const { name, email, class: studentClass, password } = req.body;
    if (!name?.trim() || !email?.trim() || !studentClass || !password || password.length < 6) {
      return res.status(400).json({ error: "Name, email, class, and a password of at least 6 characters are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await Auth.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const student = await Auth.create({
      name: name.trim(),
      email: normalizedEmail,
      role: "student",
      class: studentClass,
      password: await bcrypt.hash(password, 10)
    });

    res.status(201).json({
      _id: student._id,
      name: student.name,
      email: student.email,
      class: student.class
    });
  } catch (err) {
    console.error("Error creating student:", err);
    res.status(500).json({ error: "Error creating student" });
  }
});

router.put("/api/students/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, email, class: studentClass } = req.body;
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }
    if (!name?.trim() || !email?.trim() || !studentClass) {
      return res.status(400).json({ error: "Name, email, and class are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const duplicate = await Auth.findOne({
      email: normalizedEmail,
      _id: { $ne: studentId }
    });
    if (duplicate) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const student = await Auth.findOneAndUpdate(
      { _id: studentId, role: "student" },
      { name: name.trim(), email: normalizedEmail, class: studentClass },
      { new: true, runValidators: true, projection: { _id: 1, name: 1, email: 1, class: 1 } }
    );
    if (!student) return res.status(404).json({ error: "Student not found" });

    res.json(student);
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Error updating student" });
  }
});

//show all questions for students
router.get("/api/exam/:examId/student/:studentId", async (req, res) => {
  const { examId, studentId } = req.params;

  const exam = await AssignedQuestion.findOne({
    _id: examId,
    studentIDs: studentId
  }).populate("questionIds");

  if (!exam) {
    return res.status(403).json({ error: "Not allowed" });
  }

  res.json(exam.questionIds);
});


// 
router.get("/api/exams/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const now = new Date();

    const exams = await AssignedQuestion.find({
      studentIDs: studentId
    })
    .populate("questionIds", "_id")
    .select("examTitle subject startTime endTime examTime markPerQuestion totalMarks teacherID");

    // frontend friendly format
    const formatted = exams.map(exam => ({
      examId: exam._id,
      teacherID:exam.teacherID,
      examTitle: exam.examTitle,
      subject: exam.subject || "",
      questionCount: exam.questionIds.length,
      totalMarks: exam.totalMarks,
      examTime: exam.examTime,
      startTime: exam.startTime,
      endTime: exam.endTime,
      markPerQuestion: exam.markPerQuestion,
      
      status: now < exam.endTime ? "active" : "completed"

      
    
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load exams" });
  }
});



// AssignedQuestions.js-তে এই রাউট যোগ করুন

// GET: All exams for a specific teacher
router.get("/api/assigned-questions/teacher/:teacherId", async (req, res) => {
    try {
        const { teacherId } = req.params;
        const exams = await AssignedQuestion.find({ teacherID: teacherId })
            .populate("studentIDs", "name email")
            .populate("questionIds", "questionText");
        res.json(exams);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching exams" });
    }
});


module.exports = { router, AssignedQuestion };
