const mongoose = require('mongoose');

const writtenAnswerSchema = new mongoose.Schema({
  examID: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedQuestion', required: true },
  studentID: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth', required: true },
  teacherID: { type: mongoose.Schema.Types.ObjectId, ref: 'Auth', required: true },
  questionID: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  attemptNumber: { type: Number, required: true, default: 1, min: 1 },
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  fileName: { type: String, required: true },
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], required: true },
  data: { type: Buffer, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WrittenAnswer', writtenAnswerSchema);
