const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/online_exam_database";

function connectDatabase() {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((error) => console.error("❌ MongoDB Connection Error:", error));
}

module.exports = { connectDatabase };
