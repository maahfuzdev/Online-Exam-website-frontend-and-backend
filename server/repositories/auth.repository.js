const Auth = require("../models/Auth");
const MongooseRepository = require("./mongoose.repository");

const authRepository = Object.assign(new MongooseRepository(Auth), {
  findByEmail(email) {
    return Auth.findOne({ email });
  },

  create(userData) {
    return new Auth(userData).save();
  }
});

module.exports = { authRepository, Auth };
