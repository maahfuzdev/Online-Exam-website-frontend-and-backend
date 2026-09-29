const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("pages/index");
});

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
