# 📝 Online Examination System

A full-stack online examination platform for teachers to create and assign exams and for students to take timed quizzes and review their results.

Designed as a scalable academic assessment system supporting both **Students** and **Teachers/Admins**.

---

## 🌟 Project Overview

This system enables institutions or instructors to:

* Create and manage online exams
* Assign exams to students
* Conduct timer-based examinations
* Automatically evaluate MCQ answers
* Store and analyze results securely

The application uses Node.js, Express, MongoDB, EJS-rendered pages, and browser-based JavaScript and CSS. It is a project starter and should be configured and reviewed for your deployment environment before production use.

---

## 📸 Application Screenshots

### 🧑‍🏫 Teacher Dashboard

![Teacher Dashboard](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20034013.png)

### 📝 Exam Creation Panel

![Create Exam](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20034049.png)

### ⏱️ Student Exam Interface

![Student Exam](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20034232.png)

### 📊 Result Summary

![Result Page](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20034334.png)

### 📚 Assigned Exams View

![Assigned Exams](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20034524.png)

### 🔐 Authentication System

![Authentication](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20034717.png)

### 📈 Exam History & Records

![Exam History](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20034741.png)

---

## 🧩 Technology Stack

### Frontend

* HTML5
* CSS3
* Bootstrap
* Tailwind CSS
* Vanilla JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose ODM

### Authentication & Security

* bcrypt password hashing
* Session-based authentication
* Role-based authorization

### Development Tools

* Nodemon
* Git & GitHub

---

## ✨ Core Features

### 👨‍🎓 Student Module

* Secure registration & login
* View assigned exams
* Timer-based exam attempt
* Auto submission system
* Instant result generation
* Previous exam history

### 👨‍🏫 Teacher/Admin Module

* Create exams and add questions manually, in batches, or from scanned documents with Gemini-powered question generation
* Assign exams to students and manage student records
* Review submissions, filter and export results, and view performance analytics
* View calculated grades using the shared scale: A+ (80%+), A (70–79%), B (60–69%), C (50–59%), D (40–49%), and F (below 40%)

### ⚙️ System Features

* Role-based access control
* Automated scoring engine
* Persistent exam records
* Responsive interface for desktop and mobile
* Modular Express routes, controllers, services, repositories, and Mongoose models

---

## 🚀 Quick Start Guide

### 1️⃣ Clone Repository

```bash
git clone https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend.git
cd Online-Exam-website-frontend-and-backend
```

---

### 2️⃣ Install Dependencies

```bash
cd server
npm install
```

Requires a supported Node.js release and a reachable MongoDB database. The default local database is `mongodb://localhost:27017/online_exam_database`.

---

### 3️⃣ Environment Variables

Create:

```
server/.env
```

Add:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/online_exam_database
GEMINI_API_KEY=your_google_ai_studio_api_key
```

`PORT` and `MONGODB_URI` have defaults and can be omitted for a local setup. `GEMINI_API_KEY` is needed only for AI-assisted question generation from documents. Create a key in [Google AI Studio](https://aistudio.google.com/app/apikey); keep it in `server/.env` and out of frontend code and Git.

---

### 4️⃣ Start Server

```bash
npm run dev
```

For a regular start without automatic restarts, use `npm start`.

---

### 5️⃣ Run Application

Open browser:

```
http://localhost:3000
```

---

## 📁 Project Structure



Main project structure (dependency folders and generated files omitted):

```text
online exam app backend and frontend/
├── .github/
├── public/
│   ├── css/
│   └── js/
├── server/
│   ├── app.js
│   ├── index.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   └── views/
├── README.md
└── server/package.json
```

`server/app.js` configures Express and page rendering; `server/index.js` is the npm entry point. EJS page templates and reusable partials are under `server/views/`, while static browser assets are served from `public/`. See [server/README.md](server/README.md) for the backend layout and [server/views/README.md](server/views/README.md) for the view structure.

---

## 🔒 Deployment Strategy

Planned deployment pipeline:

* Backend → **Render / AWS / Heroku**
* Frontend → **Netlify / Vercel**
* Database → **MongoDB Atlas**
* CI/CD → GitHub Actions

Security practices:

* `.env` excluded via `.gitignore`
* Password hashing using bcrypt
* Access control separation

---

## 🛠️ Future Improvements Roadmap

* Email OTP authentication
* JWT token authentication
* Graph analytics dashboard
* Exam proctoring support
* AI cheating detection
* REST API documentation (Swagger)
* Unit & Integration testing

---

## 💼 Developer

**Md Mahfuzur Rahman**
Full Stack MERN & Flutter Developer 🚀
CSE Undergraduate — CUET

* 🌐 Portfolio: https://maahfuzdev.github.io/my-portfolio/
* 💻 GitHub: https://github.com/maahfuzdev
* 📧 Email: [maahfuz2021@gmail.com](mailto:maahfuz2021@gmail.com)

---

## ⭐ Why This Project Matters

This project demonstrates:

* Real-world full-stack system design
* Backend architecture understanding
* Database modeling
* Authentication & authorization
* Production-ready development mindset

---

## 📌 Interview Notes

During interviews mention:

* Built using **Vanilla JS + Node.js + Express + MongoDB**
* Designed modular backend routes
* Implemented automatic evaluation logic
* Focused on scalability & maintainability
* Planned production deployment architecture

---

⭐ If you like this project, consider giving it a star!
