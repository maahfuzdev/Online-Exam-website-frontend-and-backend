const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { authRepository } = require("../repositories/auth.repository");
const { questionRepository } = require("../repositories/question.repository");
const { assignedExamRepository } = require("../repositories/assigned-exam.repository");
const { resultRepository } = require("../repositories/result.repository");
const Auth = require("../models/Auth");
const AssignedQuestion = require("../models/AssignedQuestion");
const { validateExamInput } = require("../services/exam-validation.service");
const asyncHandler = require("../middleware/async-handler");

async function createAssignedExam(req, res) {
  try {
    const { teacherID, studentIDs, examTitle, subject, questionIds, startTime, endTime, examTime, markPerQuestion, totalMarks, negativeMarkingEnabled = false, negativeMarkPerWrong = 0, resultVisibility = "immediate" } = req.body;

    const validation = validateExamInput({ teacherID, studentIDs, examTitle, subject, questionIds, startTime, endTime, examTime, markPerQuestion, negativeMarkingEnabled, negativeMarkPerWrong, resultVisibility });
    if (validation) return res.status(400).json({ error: validation });
    const [teacher, studentCount, questionCount] = await Promise.all([
      authRepository.findOne({ _id: teacherID, role: "teacher" }).select("_id"),
      authRepository.countDocuments({ _id: { $in: studentIDs }, role: "student" }),
      questionRepository.countDocuments({ _id: { $in: questionIds }, teacher: teacherID })
    ]);
    if (!teacher) return res.status(403).json({ error: "A teacher account is required." });
    if (studentCount !== new Set(studentIDs.map(String)).size) return res.status(400).json({ error: "One or more selected students are invalid." });
    if (questionCount !== new Set(questionIds.map(String)).size) return res.status(400).json({ error: "One or more selected questions are invalid." });

    const newAssignment = new AssignedQuestion({
      teacherID, studentIDs, examTitle: examTitle.trim(), subject: subject.trim(), questionIds, startTime, endTime, examTime, markPerQuestion,
      totalMarks: questionIds.length * Number(markPerQuestion), negativeMarkingEnabled, negativeMarkPerWrong: negativeMarkingEnabled ? Number(negativeMarkPerWrong) : 0, resultVisibility
    });
    await newAssignment.save();

    res.status(201).json({ message: "Questions assigned successfully", assignment: newAssignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error assigning questions" });
  }

}

async function updateAssignedExam(req, res) {
  try {
    const { examId } = req.params;
    const { teacherID, studentIDs, examTitle, subject, questionIds, startTime, endTime, examTime, markPerQuestion, negativeMarkingEnabled = false, negativeMarkPerWrong = 0, resultVisibility = "immediate" } = req.body;
    if (!mongoose.isValidObjectId(examId)) return res.status(400).json({ error: "Invalid exam ID." });
    const validation = validateExamInput({ teacherID, studentIDs, examTitle, subject, questionIds, startTime, endTime, examTime, markPerQuestion, negativeMarkingEnabled, negativeMarkPerWrong, resultVisibility });
    if (validation) return res.status(400).json({ error: validation });

    const exam = await assignedExamRepository.findOne({ _id: examId, teacherID });
    if (!exam) return res.status(404).json({ error: "Exam not found in your exam list." });
    const now = new Date();
    const isLive = now >= exam.startTime && now <= exam.endTime;
    const sameQuestionIds = questionIds.length === exam.questionIds.length && questionIds.every(id => exam.questionIds.some(existing => String(existing) === String(id)));
    const sameStudentIds = studentIDs.length === exam.studentIDs.length && studentIDs.every(id => exam.studentIDs.some(existing => String(existing) === String(id)));
    if (isLive) {
      const onlyExtendsWindow = new Date(startTime).getTime() === new Date(exam.startTime).getTime() &&
        new Date(endTime).getTime() > new Date(exam.endTime).getTime() &&
        Number(examTime) === Number(exam.examTime) && examTitle.trim() === exam.examTitle && subject.trim() === exam.subject &&
        sameQuestionIds && sameStudentIds && Number(markPerQuestion) === Number(exam.markPerQuestion) &&
        Boolean(negativeMarkingEnabled) === Boolean(exam.negativeMarkingEnabled) &&
        (!negativeMarkingEnabled || Number(negativeMarkPerWrong) === Number(exam.negativeMarkPerWrong)) &&
        resultVisibility === (exam.resultVisibility || "immediate");
      if (!onlyExtendsWindow) return res.status(409).json({ error: "While an exam is live, you can only extend its closing time." });
    }

    const [teacher, studentCount, questionCount] = await Promise.all([
      authRepository.findOne({ _id: teacherID, role: "teacher" }).select("_id"),
      authRepository.countDocuments({ _id: { $in: studentIDs }, role: "student" }),
      questionRepository.countDocuments({ _id: { $in: questionIds }, teacher: teacherID })
    ]);
    if (!teacher) return res.status(403).json({ error: "A teacher account is required." });
    if (studentCount !== new Set(studentIDs.map(String)).size) return res.status(400).json({ error: "One or more selected students are invalid." });
    if (questionCount !== new Set(questionIds.map(String)).size) return res.status(400).json({ error: "One or more selected questions are invalid." });
    const hasResults = await resultRepository.exists({ examID: exam._id });
    if (hasResults) {
      if (!sameQuestionIds || !sameStudentIds || Number(markPerQuestion) !== Number(exam.markPerQuestion) || Boolean(negativeMarkingEnabled) !== Boolean(exam.negativeMarkingEnabled) || (negativeMarkingEnabled && Number(negativeMarkPerWrong) !== Number(exam.negativeMarkPerWrong))) {
        return res.status(409).json({ error: "This exam already has student results. Its students, questions, and scoring cannot be changed; you can still update its schedule and title." });
      }
    }

    Object.assign(exam, {
      studentIDs, examTitle: examTitle.trim(), subject: subject.trim(), questionIds,
      startTime: new Date(startTime), endTime: new Date(endTime), examTime: Number(examTime), markPerQuestion: Number(markPerQuestion),
      totalMarks: questionIds.length * Number(markPerQuestion), negativeMarkingEnabled: Boolean(negativeMarkingEnabled),
      negativeMarkPerWrong: negativeMarkingEnabled ? Number(negativeMarkPerWrong) : 0, resultVisibility,
      resultsReleased: resultVisibility === "teacher_release" ? exam.resultsReleased : false
    });
    await exam.save();
    res.json({ message: "Exam updated successfully.", exam });
  } catch (err) {
    console.error("Error updating exam:", err);
    res.status(500).json({ error: "Could not update this exam." });
  }

}

async function extendExamWindow(req, res) {
  try {
    const { examId } = req.params;
    const { teacherID, endTime } = req.body || {};
    const newEndTime = new Date(endTime);
    if (!mongoose.isValidObjectId(examId) || !mongoose.isValidObjectId(teacherID)) {
      return res.status(400).json({ error: "A valid exam and teacher account are required." });
    }
    if (!Number.isFinite(newEndTime.getTime())) return res.status(400).json({ error: "Choose a valid new closing time." });

    const exam = await assignedExamRepository.findOne({ _id: examId, teacherID });
    if (!exam) return res.status(404).json({ error: "Exam not found in your exam list." });
    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      return res.status(409).json({ error: "The exam is no longer live, so its closing time cannot be extended." });
    }
    if (newEndTime <= exam.endTime || newEndTime <= now) {
      return res.status(400).json({ error: "Choose a closing time later than the current closing time." });
    }

    exam.endTime = newEndTime;
    await exam.save();
    res.json({ message: "Exam closing time extended successfully.", endTime: exam.endTime });
  } catch (err) {
    console.error("Error extending exam closing time:", err);
    res.status(500).json({ error: "Could not extend this exam's closing time." });
  }

}

async function deleteAssignedExam(req, res) {
  try {
    const { examId } = req.params;
    const { teacherID } = req.body || {};
    if (!mongoose.isValidObjectId(examId) || !mongoose.isValidObjectId(teacherID)) return res.status(400).json({ error: "A valid exam and teacher account are required." });
    const examToDelete = await assignedExamRepository.findOne({ _id: examId, teacherID });
    if (!examToDelete) return res.status(404).json({ error: "Exam not found in your exam list." });
    const now = new Date();
    if (now >= examToDelete.startTime && now <= examToDelete.endTime) return res.status(409).json({ error: "A live exam cannot be deleted. Wait until it closes." });
    const exam = await assignedExamRepository.findOneAndDelete({ _id: examId, teacherID });
    await resultRepository.deleteMany({ examID: exam._id });
    res.json({ message: "Exam and its saved results were deleted." });
  } catch (err) {
    console.error("Error deleting exam:", err);
    res.status(500).json({ error: "Could not delete this exam." });
  }

}

async function releaseExamResults(req, res) {
  try {
    const { examId } = req.params;
    const { teacherID } = req.body || {};
    if (!mongoose.isValidObjectId(examId) || !mongoose.isValidObjectId(teacherID)) return res.status(400).json({ error: "A valid exam and teacher account are required." });
    const exam = await assignedExamRepository.findOne({ _id: examId, teacherID, resultVisibility: "teacher_release" });
    if (!exam) return res.status(404).json({ error: "This exam is not set to teacher-controlled result release." });
    if (new Date() <= new Date(exam.endTime)) return res.status(409).json({ error: "Wait until the exam closes before releasing results." });
    exam.resultsReleased = true;
    await exam.save();
    res.json({ message: "Results released to students.", resultsReleased: exam.resultsReleased });
  } catch (err) {
    console.error("Error releasing exam results:", err);
    res.status(500).json({ error: "Could not release results." });
  }

}

async function listStudents(req, res) {
  try {
    const students = await authRepository.find(
      { role: "student" },
      { _id: 1, name: 1, email: 1, class: 1 }
    ).sort({ name: 1 });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching students" });
  }

}

async function createStudent(req, res) {
  try {
    const { name, email, class: studentClass, password } = req.body;
    if (!name?.trim() || !email?.trim() || !studentClass || !password || password.length < 6) {
      return res.status(400).json({ error: "Name, email, class, and a password of at least 6 characters are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await authRepository.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const student = await authRepository.create({
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

}

async function updateStudent(req, res) {
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
    const duplicate = await authRepository.findOne({
      email: normalizedEmail,
      _id: { $ne: studentId }
    });
    if (duplicate) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const student = await authRepository.findOneAndUpdate(
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

}

async function getExamForStudent(req, res) {
  const { examId, studentId } = req.params;

  const exam = await assignedExamRepository.findOne({
    _id: examId,
    studentIDs: studentId
  }).populate("questionIds");

  if (!exam) {
    return res.status(403).json({ error: "Not allowed" });
  }

  res.json(exam.questionIds.map(question => ({
    _id: question._id,
    questionText: question.questionText,
    options: question.options,
    questionType: question.questionType,
    subject: question.subject
  })));

}

async function recordExamAttendance(req, res) {
  try {
    const { examId } = req.params;
    const { studentId } = req.body || {};
    if (!mongoose.isValidObjectId(examId) || !mongoose.isValidObjectId(studentId)) return res.status(400).json({ error: "A valid exam and student are required." });
    const now = new Date();
    const exam = await assignedExamRepository.findOneAndUpdate(
      { _id: examId, studentIDs: studentId, startTime: { $lte: now }, endTime: { $gte: now } },
      { $addToSet: { attendedStudentIDs: studentId } }, { new: true, projection: { _id: 1 } }
    );
    if (!exam) return res.status(403).json({ error: "This exam is not available to you right now." });
    res.json({ attended: true });
  } catch (err) {
    console.error("Could not mark exam attendance:", err);
    res.status(500).json({ error: "Could not record exam attendance." });
  }

}

async function listExamsForStudent(req, res) {
  try {
    const { studentId } = req.params;
    const now = new Date();

    const exams = await assignedExamRepository.find({
      studentIDs: studentId
    })
    .populate("questionIds", "_id")
    .select("examTitle subject startTime endTime examTime markPerQuestion totalMarks teacherID negativeMarkingEnabled negativeMarkPerWrong resultVisibility resultsReleased attendedStudentIDs");
    const attendedResults = await resultRepository.find({ studentID: studentId, examID: { $in: exams.map(exam => exam._id) } }).select("examID");
    const attendedExamIds = new Set(attendedResults.map(result => String(result.examID)));

    // frontend friendly format
    const formatted = exams.map(exam => ({
      examId: exam._id,
      attended: attendedExamIds.has(String(exam._id)) || exam.attendedStudentIDs.some(id => String(id) === String(studentId)),
      submitted: attendedExamIds.has(String(exam._id)),
      teacherID:exam.teacherID,
      examTitle: exam.examTitle,
      subject: exam.subject || "",
      questionCount: exam.questionIds.length,
      totalMarks: exam.totalMarks,
      examTime: exam.examTime,
      startTime: exam.startTime,
      endTime: exam.endTime,
      markPerQuestion: exam.markPerQuestion,
      negativeMarkingEnabled: exam.negativeMarkingEnabled,
      negativeMarkPerWrong: exam.negativeMarkPerWrong,
      resultVisibility: exam.resultVisibility || "immediate",
      resultsReleased: exam.resultsReleased,

      status: now < exam.endTime ? "active" : "completed"



    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load exams" });
  }

}

async function listExamsForTeacher(req, res) {
    try {
        const { teacherId } = req.params;
        const exams = await assignedExamRepository.find({ teacherID: teacherId })
            .populate("studentIDs", "name email")
            .populate("questionIds", "questionText");
        res.json(exams);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching exams" });
    }

}

module.exports = {
  createAssignedExam: asyncHandler(createAssignedExam),
  updateAssignedExam: asyncHandler(updateAssignedExam),
  extendExamWindow: asyncHandler(extendExamWindow),
  deleteAssignedExam: asyncHandler(deleteAssignedExam),
  releaseExamResults: asyncHandler(releaseExamResults),
  listStudents: asyncHandler(listStudents),
  createStudent: asyncHandler(createStudent),
  updateStudent: asyncHandler(updateStudent),
  getExamForStudent: asyncHandler(getExamForStudent),
  recordExamAttendance: asyncHandler(recordExamAttendance),
  listExamsForStudent: asyncHandler(listExamsForStudent),
  listExamsForTeacher: asyncHandler(listExamsForTeacher)
};
