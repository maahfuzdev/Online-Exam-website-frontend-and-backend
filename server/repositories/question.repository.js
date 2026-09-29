const MongooseRepository = require("./mongoose.repository");
const Question = require("../models/Question");

const questionRepository = new MongooseRepository(Question);

module.exports = { questionRepository, Question };
