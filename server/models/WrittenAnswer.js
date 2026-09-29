const mongoose = require('mongoose');

const writtenAnswerSchema = new mongoose.Schema({
  examID: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedQuestion', required: true },
  studentID: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth', required: true },
  teacherID: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth', required: true },
  questionID: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  fileName: { type: String, required: true },
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], required: true },
  data: { type: Buffer, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

writtenAnswerSchema.index({ examID: 1, studentID: 1, questionID: 1 }, { unique: true });

module.exports = mongoose.model('WrittenAnswer', writtenAnswerSchema);
