const mongoose = require('mongoose');

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
   negativeMarkingEnabled: { type: Boolean, default: false },
   negativeMarkPerWrong: { type: Number, default: 0 },
   resultVisibility: { type: String, enum: ["immediate", "after_exam_end", "teacher_release"], default: "immediate" },
   resultsReleased: { type: Boolean, default: false },
   attendedStudentIDs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Auth' }],
   createdAt: { type: Date, default: Date.now }
 });

const AssignedQuestion = mongoose.model('AssignedQuestion', AssignedSchema);

module.exports = AssignedQuestion;
