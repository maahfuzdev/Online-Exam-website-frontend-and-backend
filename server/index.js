
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();


// =========================================================
// MONGODB CONNECTION
// =========================================================

// MongoDB Atlas connection string will come from
// the MONGODB_URI environment variable.
//
// Local example:
// MONGODB_URI=mongodb://localhost:27017/online_exam_database
//
// Render:
// MONGODB_URI=your MongoDB Atlas connection string

const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/online_exam_database";


mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
    });


// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// =========================================================
// SERVE FRONTEND
// =========================================================

app.use(express.static(path.join(__dirname, "..", "public")));


// =========================================================
// HOME PAGE
// =========================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "public", "html", "index.html")
    );
});


// =========================================================
// STUDENT LOGIN / REGISTRATION PAGE
// =========================================================

app.get("/studentsLogReg", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "public", "html", "authentication.html")
    );
});


// =========================================================
// AUTHENTICATION ROUTES
// =========================================================

const { router: authenticationRouter } = require("./authentication");

app.use("/authentication", authenticationRouter);


// =========================================================
// QUESTION ROUTES
// =========================================================

const { router: questionRouter } = require("./question");

app.use("/", questionRouter);


// =========================================================
// RESULT ROUTES
// =========================================================

const { router: resultRouter } = require("./Results");

app.use("/results", resultRouter);


// =========================================================
// SUBMISSION ROUTES
// =========================================================

const { router: submissionRouter } = require("./Submissions");

app.use("/submissions", submissionRouter);


// =========================================================
// ASSIGNMENT ROUTES
// =========================================================

const { router: assignmentRouter } = require("./AssignedQuestions");

app.use("/assignments", assignmentRouter);


// =========================================================
// HEALTH CHECK
// =========================================================

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Online Exam Server is running"
    });
});


// =========================================================
// START SERVER
// =========================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
