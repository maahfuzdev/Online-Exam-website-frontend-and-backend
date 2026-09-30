# QuizMaster — Online Examination Platform

A full-stack online examination platform for teachers to build and assign assessments, and for students to take timed exams, submit written work, and review released results.

<p align="center">
  <a href="https://your-live-demo-url.example"><strong>Live Demo</strong></a>
  &nbsp; · &nbsp;
  <a href="https://your-video-walkthrough-url.example"><strong>Video Walkthrough</strong></a>
  &nbsp; · &nbsp;
  <a href="docs/user-guide.md"><strong>User Guide</strong></a>
  &nbsp; · &nbsp;
  <a href="docs/engineering-blueprint-en.md"><strong>Engineering Blueprint</strong></a>
</p>

> **Demo links are placeholders.** Replace `https://your-live-demo-url.example` and `https://your-video-walkthrough-url.example` with your deployed app and walkthrough video URLs.

## Overview

QuizMaster supports two user roles:

- **Teachers** create and organize questions, schedule exams for selected students, review submissions, grade written answers, release results, and view performance summaries.
- **Students** view assigned exams, complete timed attempts, upload written answers when enabled, and review results when they are released.

The application is built with Node.js, Express, MongoDB/Mongoose, EJS-rendered pages, and browser-based JavaScript/CSS. It is a project starter; review the security, privacy, accessibility, and operational requirements in the [Engineering Blueprint](docs/engineering-blueprint-en.md) before using it with real student data or high-stakes exams.

## Features

### Teacher workspace

- Create mathematical and general questions, including MCQ and written-answer formats.
- Paste and review batches of MCQs before saving them to the question bank.
- Optionally generate draft MCQs from PDF or image study material using the Gemini API.
- Create and assign exams to selected students with scheduled windows, duration, marks, optional negative marking, retake settings, and result visibility policies.
- Review exam results, manually grade written answers with feedback, release results, and export result lists to PDF or Excel.
- View student records, class information, and performance analytics.

### Student workspace

- View assigned active and past exams.
- Take timed exams with MCQ and written-answer questions.
- Upload one image or PDF for a written question (up to 8 MB per answer file).
- Review results and exam history according to the teacher's release settings.

### Platform

- Role-aware teacher and student experiences.
- Server-side sessions stored in MongoDB.
- Modular Express routes, controllers, services, repositories, and Mongoose models.
- Responsive browser interface with mathematical notation support in question creation.

## Screenshots

These screenshots are included in the repository and show the current interface. The active exam-taking screen is not represented in the current screenshot set; capture a sanitized example if you want to add it later.

<details>
  <summary>Role selection and dashboard entry</summary>
  <img src="./Screenshot%202026-04-23%20032124.png" alt="Teacher and student dashboard entry choices" width="720">
</details>

<details>
  <summary>Teacher analytics dashboard</summary>
  <img src="./Screenshot%202026-04-23%20034013.png" alt="Teacher analytics dashboard with student and exam summaries" width="900">
</details>

<details>
  <summary>Exam management</summary>
  <img src="./Screenshot%202026-04-23%20034049.png" alt="Teacher exam management workspace" width="900">
</details>

<details>
  <summary>Mathematical question creator</summary>
  <img src="./Screenshot%202026-04-23%20034232.png" alt="Question creator with mathematical symbols, formula preview, and MCQ options" width="900">
</details>

<details>
  <summary>AI-assisted document question workflow</summary>
  <img src="./Screenshot%202026-04-23%20034334.png" alt="Document upload and AI question-generation workflow" width="900">
</details>

<details>
  <summary>Student past exams</summary>
  <img src="./Screenshot%202026-04-23%20034717.png" alt="Student dashboard showing past exam history" width="900">
</details>

<details>
  <summary>Student results</summary>
  <img src="./Screenshot%202026-04-23%20034741.png" alt="Student detailed results and score summaries" width="900">
</details>

## Technology

| Area | Tools |
|---|---|
| Runtime and server | Node.js, Express 5 |
| Views and browser UI | EJS, HTML, CSS, vanilla JavaScript |
| Data | MongoDB, Mongoose |
| Authentication | Express sessions, Mongo-backed session store, bcryptjs |
| Optional AI integration | Gemini API for document-based question suggestions |

## Quick Start

### Prerequisites

- Node.js and npm
- MongoDB running locally or a MongoDB connection URI
- Optional: a Gemini API key for AI-assisted question generation from documents

### 1. Clone the repository

```bash
git clone https://github.com/maahfuzdev/Online-Exam-website-frontend-and-backend.git
cd Online-Exam-website-frontend-and-backend
```

### 2. Install backend dependencies

```bash
cd server
npm ci
```

### 3. Configure environment variables

Create `server/.env` from the example:

```bash
# macOS / Linux
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Review the values in `server/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/online_exam_database
GEMINI_API_KEY=
SESSION_SECRET=replace-with-a-long-random-secret
```

`PORT` and `MONGODB_URI` have local defaults. `GEMINI_API_KEY` is optional and is only required for AI-assisted document question generation. `SESSION_SECRET` is recommended; use a long, randomly generated value in deployed environments and keep all secrets out of Git. The `server/.env` file is ignored by Git through `server/.gitignore`.

### 4. Start the application

From the `server/` directory:

```bash
npm run dev
```

For a regular start without automatic restarts:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). MongoDB must be reachable using the configured URI.

## How to use the application

1. Create separate teacher and student accounts from the sign-in page. Choose the matching role; students also enter a class/grade.
2. As a teacher, create questions manually, in a batch, or optionally from a document using the AI question workflow. Review AI output before saving it.
3. Create an exam, select questions and registered students, configure timing/scoring/result policies, then assign it.
4. As a student, open an assigned active exam, answer the questions, upload written work if requested, and submit before time expires.
5. As a teacher, review results and grade written answers. Students can view results when the exam's release policy allows it.

For detailed steps and troubleshooting, see the [User Guide](docs/user-guide.md).

## Project structure

```text
.
├── docs/
│   ├── engineering-blueprint-en.md
│   ├── engineering-blueprint-en.pdf
│   ├── engineering-blueprint-bn.md
│   ├── engineering-blueprint-bn.pdf
│   └── user-guide.md
├── public/
│   ├── css/
│   └── js/
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   └── views/
├── README.md
└── Screenshot *.png
```

`server/app.js` configures Express, sessions, routes, and page rendering. `server/index.js` loads the application entry point. EJS views are under `server/views/`; browser assets are served from `public/`.

## Documentation

- [User Guide](docs/user-guide.md) — setup/use flows, teacher and student tasks, troubleshooting, and the current grade scale.
- [Engineering Blueprint (English)](docs/engineering-blueprint-en.md) — SRS, architecture, security, QA, and delivery plan.
- [Engineering Blueprint (English PDF)](docs/engineering-blueprint-en.pdf)
- [Engineering Blueprint (Bangla)](docs/engineering-blueprint-bn.md)
- [Engineering Blueprint (Bangla PDF)](docs/engineering-blueprint-bn.pdf)
- [Backend layout notes](server/README.md)
- [View structure notes](server/views/README.md)

Keep editable documentation in Markdown and update the related PDF when the specification changes.

## Development notes

- The `server` package provides `npm run dev` and `npm start` scripts.
- The current `npm test` script is a placeholder; an automated test suite has not been configured yet.
- No public demo credentials are provided. Create local accounts for the teacher/student walkthrough.
- Do not use real student data in screenshots, demos, or issue reports without appropriate authorization and privacy safeguards.

## Deployment

No live deployment URL is configured in this repository yet. Replace the demo placeholders at the top of this README after deploying the app. Before production use, configure HTTPS, a stable session secret, a managed MongoDB deployment, backups, monitoring, and environment-specific secrets. Review the [Engineering Blueprint](docs/engineering-blueprint-en.md) for proposed security, privacy, recovery, and release checks.

## Contributing

1. Open an issue describing the change or bug.
2. Make a focused change on a feature branch.
3. Include clear reproduction steps or acceptance criteria in the pull request.
4. Do not commit `.env` files, credentials, or real exam/student data.

## Maintainer

**Md Mahfuzur Rahman**  
Portfolio: [maahfuzdev.github.io/my-portfolio](https://maahfuzdev.github.io/my-portfolio/) · GitHub: [@maahfuzdev](https://github.com/maahfuzdev) · [Email](mailto:maahfuz2021@gmail.com)
