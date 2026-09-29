const mongoose = require("mongoose");

function validateExamInput({ teacherID, studentIDs, examTitle, subject, questionIds, startTime, endTime, examTime, markPerQuestion, negativeMarkingEnabled, negativeMarkPerWrong, resultVisibility }) {
  if (!mongoose.isValidObjectId(teacherID)) return "Please sign in again as a teacher.";
  if (!Array.isArray(studentIDs) || !studentIDs.length || studentIDs.some(id => !mongoose.isValidObjectId(id))) return "Select at least one valid student.";
  if (!Array.isArray(questionIds) || !questionIds.length || questionIds.some(id => !mongoose.isValidObjectId(id))) return "Select at least one valid question.";
  if (!examTitle?.trim() || !subject?.trim()) return "Exam title and subject are required.";
  if (!Number.isFinite(new Date(startTime).getTime()) || !Number.isFinite(new Date(endTime).getTime()) || new Date(startTime) >= new Date(endTime)) return "Choose a valid exam window. The end time must be after the start time.";
  if (!Number.isFinite(Number(examTime)) || Number(examTime) <= 0 || !Number.isFinite(Number(markPerQuestion)) || Number(markPerQuestion) <= 0) return "Exam duration and marks per question must be greater than zero.";
  if (negativeMarkingEnabled && (!Number.isFinite(Number(negativeMarkPerWrong)) || Number(negativeMarkPerWrong) <= 0)) return "Set a negative mark greater than zero, or turn negative marking off.";
  if (!["immediate", "after_exam_end", "teacher_release"].includes(resultVisibility)) return "Choose a valid result release option.";
  return null;
}

module.exports = { validateExamInput };
