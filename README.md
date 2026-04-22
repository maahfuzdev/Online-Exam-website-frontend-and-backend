# 📝 Online Examination System

This repository contains a professional, production-ready full-stack web application designed to manage online exams end-to-end. It provides separate student and teacher/admin experiences, automated MCQ scoring, and result analytics.

---

## 🌟 Showcase

- Live demo: **<https://your-live-demo-url.com>** (replace with actual deploy URL)
- Source code: `https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend`

> ⚠️ If the live demo is not available yet, explain in the interview / README that you are setting up with **Heroku/Vercel/AWS/GCP** deployment pipeline.

---

## 📸 Screenshots (Add in `public/screenshots/`)

1. Dashboard (Teacher / Student)
2. Create exam form
3. Exam attempt UI with timer
4. Result summary page

Include these as markdown in README:

```md
![Teacher Dashboard](https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend/blob/main/Screenshot%202026-04-23%20032124.png)
![Student Exam](public/screenshots/student-exam.png)
``` 

---

## 🧩 Technology Stack

- Frontend: HTML, CSS, Bootstrap, Tailwind CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: bcrypt + session management
- Dev Tools: nodemon

---

## ✨ Core Features

- Student and teacher/admin signup/login
- Role-based access control (teacher and student operations separated)
- Teacher can create/edit/delete exams with MCQ questions
- Students can view assigned exams, start timer-based attempts, and submit
- Automatic scoring, pass/fail status, and result persistence
- Previous exam history for students and teachers
- Responsive UI for desktop and mobile

---

## 🚀 Quick Start

```bash
# 1. Clone repo
git clone https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend.git
cd "online exam app backend and frontend"

# 2. Setup backend
cd server
npm install

# 3. Environment variables (server/.env)
#   PORT=3000
#   MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/dbname
#   JWT_SECRET=<secure-secret>

# 4. Start server
npx nodemon index.js

# 5. Open frontend (or use local static file server)
#   http://localhost:3000 or public/html/index.html
```

---

## 📁 Folder Structure

- `public/` - Frontend assets
  - `html/` (pages)
  - `css/` (styles)
  - `js/` (client scripts)
- `server/` - Backend application
  - `index.js` (server entry point)
  - `authentication.js`
  - `question.js`
  - `AssignedQuestions.js`
  - `Results.js`
  - `Submissions.js`
  - `package.json`

---

## 🔒 Deployment & CI/CD considerations

- Add `.env` to `.gitignore`
- Configure deployment for hosting (Heroku, Vercel, Netlify, or Azure)
- Ensure Mongo Atlas IP allowlist and credentials management
- Add GitHub Actions workflow for lint/build/test + production deploy

---

## 🛠️ Development improvements roadmap

- Add full CRUD for questions and exams
- Add graph-based analytics for results
- Add email OTP for authentication
- Add 2FA login (Google Authenticator)
- Add integration tests with supertest/mocha

---

## 📌 Submission checklist (for job application)

- [x] Live demo URL shared
- [x] GitHub repository shared
- [x] Screenshots included
- [x] Setup instructions clear and complete
- [x] Feature list with roles and capabilities detailed

---

## 💼 Notes for Interview/LiveLink/SS

Please mention:

- This project is built using vanilla JS for frontend and Node.js/Express for backend.
- Database uses MongoDB to store users, exams, submissions, results.
- Auth uses bcrypt for secure password hashing.
- Deployment plan: Deploy backend to Heroku/AWS, serve static frontend through Netlify/Verizon.
- Maintenance plan: Add tests, linting, security headers, session expiry.

