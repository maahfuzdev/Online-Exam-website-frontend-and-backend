const AssignedQuestion = require("../models/AssignedQuestion");
const MongooseRepository = require("./mongoose.repository");

const assignedExamRepository = Object.assign(new MongooseRepository(AssignedQuestion), {
  findById(examId, projection) {
    return AssignedQuestion.findById(examId).select(projection);
  },

  findByIds(examIds, projection) {
    return AssignedQuestion.find({ _id: { $in: examIds } }).select(projection);
  }
});

module.exports = { assignedExamRepository };
