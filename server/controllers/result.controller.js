const { resultRepository } = require("../repositories/result.repository");
const { assignedExamRepository } = require("../repositories/assigned-exam.repository");
const Result = require("../models/Result");
const { findAssignedExam, canStudentViewResult, visibleResultsForStudent } = require("../services/result-visibility.service");
const { scoreExamAnswers } = require("../services/result-scoring.service");
const asyncHandler = require("../middleware/async-handler");
const mongoose = require("mongoose");
const WrittenAnswer = require("../models/WrittenAnswer");

const writtenAnswerTypes = {
  'image/jpeg': { extension: 'jpg', magic: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: 'png', magic: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', magic: buffer => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
  'application/pdf': { extension: 'pdf', magic: buffer => buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-' }
};
let writtenAnswerIndexMigration;

function resultAttemptFilter(attemptNumber) {
  return attemptNumber === 1
    ? { $or: [{ attemptNumber: 1 }, { attemptNumber: { $exists: false } }] }
    : { attemptNumber };
}

async function ensureWrittenAnswerAttemptIndex() {
  if (!writtenAnswerIndexMigration) {
    writtenAnswerIndexMigration = (async () => {
      let indexes = [];
      try {
        indexes = await WrittenAnswer.collection.indexes();
      } catch (error) {
        if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
      }
      const legacyIndex = indexes.find(index => index.unique && index.key.examID === 1 && index.key.studentID === 1 && index.key.questionID === 1 && !index.key.attemptNumber);
      if (legacyIndex) await WrittenAnswer.collection.dropIndex(legacyIndex.name);
      await WrittenAnswer.collection.updateMany({ attemptNumber: { $exists: false } }, { $set: { attemptNumber: 1 } });
      const attemptIndex = indexes.find(index => index.unique && index.key.examID === 1 && index.key.studentID === 1 && index.key.questionID === 1 && index.key.attemptNumber === 1);
      if (!attemptIndex) await WrittenAnswer.collection.createIndex({ examID: 1, studentID: 1, questionID: 1, attemptNumber: 1 }, { unique: true });
    })().catch(error => {
      writtenAnswerIndexMigration = null;
      throw error;
    });
  }
  return writtenAnswerIndexMigration;
}

async function saveWrittenAnswer(req, res) {
  const { studentID, examID, questionID, questionIndex, fileName, contentType, data } = req.body || {};
  const attemptNumber = Number(req.body?.attemptNumber || 1);
  if (![studentID, examID, questionID].every(mongoose.isValidObjectId) || !Number.isInteger(Number(questionIndex)) || Number(questionIndex) < 0) {
    return res.status(400).json({ error: 'A valid student, exam, question, and question number are required.' });
  }
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) return res.status(400).json({ error: 'A valid exam attempt is required.' });
  const fileType = Object.prototype.hasOwnProperty.call(writtenAnswerTypes, contentType) ? writtenAnswerTypes[contentType] : null;
  const dataUrlMatch = typeof data === 'string' && data.match(/^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!fileType || !dataUrlMatch || dataUrlMatch[1] !== contentType) return res.status(400).json({ error: 'Upload a JPG, PNG, WebP image, or PDF file.' });
  const encoded = dataUrlMatch[2];
  if (encoded.length > 11 * 1024 * 1024) return res.status(413).json({ error: 'Each answer file must be 8 MB or smaller.' });
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024 || !fileType.magic(buffer)) {
    return res.status(400).json({ error: 'The file content does not match the selected image or PDF type.' });
  }

  const exam = await assignedExamRepository.findOne({ _id: examID, studentIDs: studentID }).populate('questionIds');
  if (!exam) return res.status(403).json({ error: 'You are not assigned to this exam.' });
  if (!exam.writtenAnswersEnabled) return res.status(403).json({ error: 'Handwritten uploads are not enabled for this exam.' });
  const previousAttempts = await resultRepository.countDocuments({ examID, studentID });
  if (previousAttempts && !exam.allowRetakes) return res.status(409).json({ error: 'This exam only allows one attempt.' });
  if (attemptNumber !== previousAttempts + 1) return res.status(409).json({ error: 'This exam attempt is no longer active. Refresh the student dashboard and try again.' });
  if (!exam.attendedStudentIDs.some(id => String(id) === String(studentID))) return res.status(403).json({ error: 'Open the exam before uploading answers.' });
  await ensureWrittenAnswerAttemptIndex();
  const now = new Date();
  if (now < exam.startTime || now > exam.endTime) return res.status(403).json({ error: 'Answer uploads are only available while the exam is open.' });
  const index = Number(questionIndex);
  const question = exam.questionIds[index];
  if (!question || String(question._id) !== String(questionID)) return res.status(400).json({ error: 'The question does not belong to this exam.' });

  const cleanName = String(fileName || 'answer').split(/[\\/]/).pop().replace(/[^\p{L}\p{N}._ -]/gu, '').trim().slice(0, 120) || 'answer';
  const writtenAnswer = await WrittenAnswer.findOneAndUpdate(
    { examID, studentID, questionID, attemptNumber },
    { $set: {
      examID, studentID, teacherID: exam.teacherID, questionID, attemptNumber, questionIndex: index,
      questionText: question.questionText, fileName: cleanName, contentType, data: buffer, uploadedAt: now
    } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ success: true, questionIndex: index, fileName: writtenAnswer.fileName, contentType });
}

async function listWrittenAnswersForTeacher(req, res) {
  const { examID, studentID } = req.params;
  const { teacherID } = req.query;
  const attemptNumber = Math.max(1, Number(req.query.attemptNumber) || 1);
  if (![examID, studentID, teacherID].every(mongoose.isValidObjectId)) return res.status(400).json({ error: 'A valid teacher, exam, and student are required.' });
  const exam = await assignedExamRepository.findOne({ _id: examID, teacherID, studentIDs: studentID }).select('_id');
  if (!exam) return res.status(404).json({ error: 'Exam not found in your exam list.' });
  if (!await resultRepository.exists({ examID, studentID, ...resultAttemptFilter(attemptNumber) })) return res.status(409).json({ error: 'Written answers are available after the student submits this attempt.' });
  await ensureWrittenAnswerAttemptIndex();
  const [answers, result] = await Promise.all([
    WrittenAnswer.find({ examID, studentID, attemptNumber }).select('questionID fileName contentType uploadedAt'),
    resultRepository.findOne({ examID, studentID, ...resultAttemptFilter(attemptNumber) })
  ]);
  const filesByQuestion = new Map(answers.map(answer => [String(answer.questionID), answer]));
  res.json((result.answerReview || []).filter(item => item.answerType === 'written').map((item, index) => {
    const file = filesByQuestion.get(String(item.questionID));
    return {
      questionID: item.questionID,
      questionIndex: (result.answerReview || []).indexOf(item),
      questionText: item.questionText,
      fileName: file?.fileName || '',
      contentType: file?.contentType || '',
      uploadedAt: file?.uploadedAt || null,
      marksAwarded: item.marksAwarded ?? null,
      teacherFeedback: item.teacherFeedback || '',
      maxMarks: item.maxMarks,
      url: file ? `/results/api/written-answers/${examID}/${studentID}/${item.questionID}/file?teacherID=${teacherID}&attemptNumber=${attemptNumber}` : null
    };
  }));
}

async function gradeWrittenAnswer(req, res) {
  try {
  const { examID, studentID, questionID } = req.params;
  const { teacherID } = req.query;
  const attemptNumber = Math.max(1, Number(req.query.attemptNumber) || 1);
  const rawMarks = req.body?.marks;
  const marks = Number(rawMarks);
  const teacherFeedback = typeof req.body?.feedback === 'string' ? req.body.feedback.trim() : '';
  if (![examID, studentID, questionID, teacherID].every(mongoose.isValidObjectId) || rawMarks === '' || rawMarks == null || !Number.isFinite(marks) || marks < 0) {
    return res.status(400).json({ error: 'Enter a valid mark of zero or more.' });
  }
  if (!teacherFeedback || teacherFeedback.length > 2000) return res.status(400).json({ error: 'Add feedback for this question (up to 2,000 characters).' });
  const exam = await assignedExamRepository.findOne({ _id: examID, teacherID, studentIDs: studentID }).populate('questionIds');
  if (!exam) return res.status(404).json({ error: 'Exam not found in your exam list.' });
  const result = await resultRepository.findOne({ examID, studentID, teacherID, ...resultAttemptFilter(attemptNumber) });
  if (!result) return res.status(404).json({ error: 'Student result not found.' });
  const index = (result.answerReview || []).findIndex(item => String(item.questionID) === String(questionID) && item.answerType === 'written');
  if (index < 0) return res.status(404).json({ error: 'Written question not found in this result.' });
  const maximum = Number(result.answerReview[index].maxMarks ?? exam.markPerQuestion) || 0;
  if (marks > maximum) return res.status(400).json({ error: `Marks cannot exceed ${maximum}.` });
  result.answerReview[index].marksAwarded = marks;
  result.answerReview[index].teacherFeedback = teacherFeedback;
  const writtenItems = result.answerReview.filter(item => item.answerType === 'written');
  const uploadedAnswers = await WrittenAnswer.find({ examID, studentID, attemptNumber }).select('questionID');
  const uploadedQuestionIds = new Set(uploadedAnswers.map(answer => String(answer.questionID)));
  writtenItems.forEach(item => { item.answerSubmitted = uploadedQuestionIds.has(String(item.questionID)); });
  result.manualMarks = writtenItems.reduce((sum, item) => sum + (Number(item.marksAwarded) || 0), 0);
  result.manualGradingPending = writtenItems.some(item => item.marksAwarded == null || !item.teacherFeedback?.trim());
  result.skippedQuestion = result.answerReview.filter(item => item.answerType === 'written'
    ? !item.answerSubmitted
    : item.selectedOption == null || item.selectedOption === '').length;
  result.score = (Number(result.mcqScore) || 0) + result.manualMarks;
  result.percentage = result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0;
  await result.save();
  res.json({ success: true, score: result.score, totalMarks: result.totalMarks, percentage: result.percentage, manualGradingPending: result.manualGradingPending });
  } catch (error) {
    console.error('Could not save written answer marks:', error);
    res.status(500).json({ error: 'Could not save marks. Please retry or check the server logs.' });
  }
}

async function getWrittenAnswerFile(req, res) {
  try {
  const { examID, studentID, questionID } = req.params;
  const { teacherID } = req.query;
  const attemptNumber = Math.max(1, Number(req.query.attemptNumber) || 1);
  if (![examID, studentID, questionID, teacherID].every(mongoose.isValidObjectId)) return res.status(400).json({ error: 'A valid teacher, exam, student, and question are required.' });
  const exam = await assignedExamRepository.findOne({ _id: examID, teacherID, studentIDs: studentID }).select('_id');
  if (!exam || !await resultRepository.exists({ examID, studentID, ...resultAttemptFilter(attemptNumber) })) return res.status(404).json({ error: 'Written answer not found.' });
  await ensureWrittenAnswerAttemptIndex();
  const answer = await WrittenAnswer.findOne({ examID, studentID, questionID, attemptNumber }).select('data contentType fileName');
  if (!answer) return res.status(404).json({ error: 'Written answer not found.' });
  const fileData = Buffer.from(answer.data);
  res.set({
    'Content-Type': answer.contentType,
    'Content-Disposition': `inline; filename="${answer.fileName.replace(/["\\\r\n]/g, '_')}"`,
    'Content-Length': String(fileData.length),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(fileData);
  } catch (error) {
    console.error('Could not serve written answer file:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Could not open the written answer file.' });
    else res.destroy(error);
  }
}

async function submitStudentResult(req, res) {
  try {
    const { studentID, examID, timeTaken, answers } = req.body;
    const attemptNumber = Number(req.body?.attemptNumber || 1);
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1) return res.status(400).json({ success: false, message: 'A valid exam attempt is required.' });

        const exam = await assignedExamRepository.findOne({ _id: examID, studentIDs: studentID }).populate("questionIds");
        if (!exam) return res.status(403).json({ success: false, message: "You are not assigned to this exam." });

    const previousAttempts = await resultRepository.countDocuments({ studentID, examID });
    if (previousAttempts && !exam.allowRetakes) {
      const existingResult = await resultRepository.findOne({ studentID, examID }).sort({ attemptNumber: -1, generatedAt: -1 });
      const visible = canStudentViewResult(exam);
      return res.status(200).json({
        success: true,
        submitted: true,
        message: "This exam has already been submitted.",
        result: visible && !existingResult.manualGradingPending ? existingResult : null,
        resultVisibility: exam.resultVisibility || "immediate",
        resultsReleased: Boolean(exam.resultsReleased)
      });
    }
    if (attemptNumber !== previousAttempts + 1) return res.status(409).json({ success: false, message: 'This exam attempt is no longer active. Refresh the student dashboard and try again.' });

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

        const uploadedWrittenAnswers = await WrittenAnswer.find({ examID, studentID, attemptNumber }).select('questionID');
        const uploadedWrittenQuestionIds = new Set(uploadedWrittenAnswers.map(answer => String(answer.questionID)));
        const scoring = scoreExamAnswers(exam.questionIds, answers, exam, uploadedWrittenQuestionIds);
    const { answerReview, correctCount, wrongCount, skippedCount, score, totalMarks, percentage } = scoring;
    const hasWrittenQuestions = exam.questionIds.some(question => question.answerType === 'written');
    const adjustedTotalMarks = (Number(exam.markPerQuestion) || 0) * exam.questionIds.length;

    const newResult = new Result({
      studentID,
      teacherID: exam.teacherID,
      examID,
      examTitle: exam.examTitle,
      attemptNumber,
      totalQuestions: answerReview.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      skippedQuestion: skippedCount,
      score,
      totalMarks: adjustedTotalMarks || totalMarks,
      mcqScore: score,
      manualMarks: 0,
      manualGradingPending: hasWrittenQuestions,
      percentage: adjustedTotalMarks > 0 ? score / adjustedTotalMarks * 100 : percentage,
      timeTaken,
      date: new Date(),
      answerReview
    });

    await newResult.save();

    const visible = canStudentViewResult(exam);

    res.status(201).json({
      success: true,
      submitted: true,
      message: hasWrittenQuestions
        ? "Your submission is saved. The teacher must finish marking written answers before the final result is available."
        : visible ? "Result saved successfully" : "Your submission is saved. The teacher's release rule will determine when you can see your result.",
      result: visible && !hasWrittenQuestions ? newResult : null,
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

    const results = await resultRepository.find({ studentID, examID, manualGradingPending: { $ne: true } });
    const exam = await findAssignedExam(examID);
    if (!canStudentViewResult(exam)) {
      return res.status(403).json({ success: false, message: "The teacher has not released this result yet.", count: 0, data: [] });
    }

    res.status(200).json({
      success: true,
      count: results.filter(result => !result.manualGradingPending).length,
      data: results.filter(result => !result.manualGradingPending)
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
    const exam = await assignedExamRepository.findOne({ _id: examID, teacherID: req.authUser._id });
    if (!exam) return res.status(404).json({ error: "Exam not found." });
    const results = await resultRepository.find({ examID, manualGradingPending: { $ne: true } }).populate("studentID", "name");
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
      .populate("examID", "subject writtenAnswersEnabled")
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
        attemptNumber: result.attemptNumber || 1,
        writtenAnswersEnabled: Boolean(result.examID?.writtenAnswersEnabled),
        manualGradingPending: Boolean(result.manualGradingPending),
        examTitle: result.examTitle || "Exam",
        subject: result.examID?.subject || "",
        score: result.score ?? 0,
        total: result.totalMarks ?? 0,
        correctAnswers: result.correctAnswers ?? 0,
        wrongAnswers: result.wrongAnswers ?? 0,
        skippedQuestion: result.skippedQuestion ?? 0,
        answerReview: (result.answerReview || []).map(item => ({
          questionID: item.questionID,
          questionText: item.questionText || "",
          options: item.options || [],
          selectedOption: item.selectedOption ?? null,
          correctOption: item.correctOption ?? null,
          isCorrect: Boolean(item.isCorrect),
          answerType: item.answerType || "mcq",
          answerSubmitted: Boolean(item.answerSubmitted),
          maxMarks: item.maxMarks ?? 0,
          marksAwarded: item.marksAwarded ?? null,
          teacherFeedback: item.teacherFeedback || ""
        })),
        percentage,
        grade: percentage >= 80 ? "A+" : percentage >= 70 ? "A" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 40 ? "D" : "F",
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
  listTeacherResults: asyncHandler(listTeacherResults),
  saveWrittenAnswer: asyncHandler(saveWrittenAnswer),
  gradeWrittenAnswer: asyncHandler(gradeWrittenAnswer),
  listWrittenAnswersForTeacher: asyncHandler(listWrittenAnswersForTeacher),
  getWrittenAnswerFile: asyncHandler(getWrittenAnswerFile)
};
