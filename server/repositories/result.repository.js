const MongooseRepository = require("./mongoose.repository");
const Result = require("../models/Result");

const resultRepository = new MongooseRepository(Result);

module.exports = { resultRepository, Result };
