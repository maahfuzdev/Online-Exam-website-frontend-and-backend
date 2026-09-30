const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const apiRoutes = require("./routes");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/online_exam_database";
app.use(session({
  name: "quizmaster.sid",
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  store: MongoStore.create({ mongoUrl: mongoUri, collectionName: "sessions", ttl: 60 * 60 * 8 }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.get("/", (req, res) => {
  res.render("pages/index");
});

app.get("/how-it-works", (req, res) => {
  res.render("pages/how-it-works");
});

app.get("/about", (req, res) => {
  res.render("pages/about-creator");
});

// Clean, role-based page URLs. EJS templates remain under views/pages.
app.get("/login", (req, res) => {
  res.render("pages/authentication");
});

app.get("/teacher/dashboard", (req, res) => {
  res.render("pages/teacherdash");
});

app.get("/student/dashboard", (req, res) => {
  res.render("pages/studentdash");
});

app.get("/teacher/questions/ocr", (req, res) => {
  res.render("pages/ocrsystem");
});

app.get("/teacher/exams/:examId/results", (req, res) => {
  res.render("pages/examresult");
});

// Legacy login URL retained for older bookmarks and external links.
app.get("/studentsLogReg", (req, res) => {
  res.render("pages/authentication");
});

const pageViews = [
  "index",
  "authentication",
  "studentdash",
  "teacherdash",
  "ocrsystem",
  "examresult"
];

pageViews.forEach((page) => {
  app.get(`/html/${page}.html`, (req, res) => {
    res.render(`pages/${page}`);
  });
});

app.use(apiRoutes);

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Online Exam Server is running" });
});

app.use(express.static(path.join(__dirname, "..", "public")));

module.exports = app;
