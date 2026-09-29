const { assignedExamRepository } = require("../repositories/assigned-exam.repository");

async function findAssignedExam(examId) {
  return assignedExamRepository.findById(examId, "endTime resultVisibility resultsReleased teacherID");
}

function canStudentViewResult(exam) {
  if (!exam) return true;
  const policy = exam.resultVisibility || "immediate";
  if (policy === "after_exam_end") return new Date() >= new Date(exam.endTime);
  if (policy === "teacher_release") return Boolean(exam.resultsReleased);
  return true;
}

async function visibleResultsForStudent(results) {
  const examIds = [...new Set(results.map(result => String(result.examID)).filter(Boolean))];
  const exams = await assignedExamRepository.findByIds(examIds, "endTime resultVisibility resultsReleased");
  const examById = new Map(exams.map(exam => [String(exam._id), exam]));
  return results.filter(result => canStudentViewResult(examById.get(String(result.examID))));
}

module.exports = { findAssignedExam, canStudentViewResult, visibleResultsForStudent };
