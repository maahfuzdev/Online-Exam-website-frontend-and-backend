# 📝 Online Examination System

A **production-ready full-stack Online Examination Platform** built to conduct exams digitally with automated evaluation, role-based access, and real-time result processing.

Designed as a scalable academic assessment system supporting both **Students** and **Teachers/Admins**.

---

## 🌟 Project Overview

This system enables institutions or instructors to:

* Create and manage online exams
* Assign exams to students
* Conduct timer-based examinations
* Automatically evaluate MCQ answers
* Store and analyze results securely

The application follows **modern full-stack architecture** using Node.js, Express, MongoDB, and responsive frontend technologies.

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

* Create exams dynamically
* Add/edit/delete MCQ questions
* Assign exams to students
* View submissions
* Analyze performance results

### ⚙️ System Features

* Role-based access control
* Automated scoring engine
* Persistent exam records
* Responsive UI design
* Modular backend routing architecture

---

## 🚀 Quick Start Guide

### 1️⃣ Clone Repository

```bash
git clone https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend.git
cd "online exam app backend and frontend"
```

---

### 2️⃣ Backend Setup

```bash
cd server
npm install
```

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
JWT_SECRET=your_secret_key
```

---

### 4️⃣ Start Server

```bash
npx nodemon index.js
```

---

### 5️⃣ Run Application

Open browser:

```
http://localhost:3000
```

---

## 📁 Project Structure

```
Online-Exam-website
│
├── public/
│   ├── html/
│   ├── css/
│   ├── js/
│
├── server/
│   ├── index.js
│   ├── authentication.js
│   ├── question.js
│   ├── Results.js
│   ├── Submissions.js
│   ├── AssignedQuestions.js
│
└── README.md
```

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
