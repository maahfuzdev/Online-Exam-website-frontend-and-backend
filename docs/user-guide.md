# QuizMaster User Guide

This guide explains the current teacher and student workflows in the Online Examination System. For installation and configuration, start with the [project README](../README.md). For product requirements and architecture, see the [Engineering Blueprint](engineering-blueprint-en.md).

> Demo video: [Replace with your walkthrough video](https://your-video-walkthrough-url.example)

## 1. Open the application and create an account

1. Start the application by following the [Quick Start](../README.md#quick-start) instructions.
2. Open `http://localhost:3000` and choose **Sign in** or **Create an account**.
3. On registration, choose **Teacher** or **Student**. Students must also enter their class/grade. Use an email address and a password of at least six characters.
4. Sign in with the same account. The app opens the dashboard for that account's role.

There are no shared demo credentials. Create separate teacher and student accounts when trying the full workflow. A teacher can update a registered student's class from the **Students** area.

## 2. Teacher workflow

### Create questions manually

1. Open the **Teacher Dashboard** and go to **Question Creation** or the question creator in the exam workspace.
2. Choose **Mathematical** or **General**. Mathematical questions include formula/symbol helpers and a preview.
3. Add the question text and subject/class details. Choose **MCQ** or **Written answer**.
4. For an MCQ, enter the answer choices and mark the correct choice. For a written question, configure it for teacher grading; students submit a photo or PDF during the exam.
5. Save the question. It is available in the teacher's question bank for exam creation.

### Add questions in a batch

Use **Paste many questions** to import up to 100 MCQs in one batch. Put each of the four choices on its own line and use one consistent label style per question: `A–D`, `a–d`, `I–IV`, `i–iv`, or `ক–ঘ`. Add a matching answer line after each question (for example, `Answer: iii` or `উত্তর: গ`). The app keeps the labels you typed when it saves and displays the question. Review the parsed questions and answers before saving.

### Generate draft MCQs from a document (optional)

1. Configure `GEMINI_API_KEY` in `server/.env` as described in the README.
2. Open the OCR/AI question creator from the teacher workspace.
3. Upload supported study material (PDF, JPEG, PNG, or WebP), select the subject, class, language and question count, then start generation.
4. Review and edit the generated questions and answer keys before saving them to the question bank.

AI generation is optional and requires a working provider key and internet access. Treat generated questions as drafts and verify their correctness before using them in an exam.

### Create and assign an exam

1. Open **Exams** → **Create New Exam**.
2. Select saved questions, then enter an exam title and subject.
3. Choose one or more registered students. Check the start and end date/time and the allowed attempt duration.
4. Set marks per question. If enabled, set the negative mark deducted for each wrong answer.
5. Choose the result visibility policy:
   - **Immediate** — show the result as soon as it is available.
   - **After exam end** — show it after the scheduled exam window ends.
   - **Teacher release** — keep results hidden until the teacher releases them.
6. If the exam has written questions, enable handwritten answer uploads. Decide whether retakes are allowed.
7. Review the exam details and save/assign it.

The start time must be before the end time, and the duration and marks must be greater than zero. Use the exam list to review or manage assigned exams.

### Review results and grade written answers

1. Open **Student Results** or the relevant exam's results view.
2. Filter or search the results as needed. PDF, Excel and print export actions are available in the results area.
3. For a written answer, open the student's submission, review the uploaded file, enter a mark within the question's maximum, and add feedback.
4. When written grading is complete, apply the configured release policy. Students cannot see a result while manual grading is still pending.

The analytics area includes grade/score distributions and exam performance summaries when result data is available.

### Manage students

Open **Students** to browse registered students and filter by class. To change a student's class, select the registered student by email and save the new class/grade.

## 3. Student workflow

1. Sign in with a **Student** account. If registering, choose the Student role and enter a class/grade.
2. Open **Active Exams** to see exams assigned to the account. The exam must be within its scheduled window to start.
3. Open the exam and read its title, question count, marks, duration and any exam instructions before beginning.
4. Answer MCQs and move between questions using the question navigation. The timer shows the remaining time.
5. For written questions, attach a clear JPG, PNG, WebP or PDF answer file (up to 8 MB per question).
6. Submit the exam before time expires. If confirmation is shown, confirm submission.
7. Open **Results** when the teacher's result policy permits it. Written exams may remain pending until the teacher grades them. Use **Past Exams** to review previous attempts and attendance status.

Do not close the exam or rely on an unsaved browser state while answering. If the network drops, reconnect and check the exam state before trying to submit again.

## 4. Result and grade reference

The current grade scale is:

| Grade | Percentage |
|---|---:|
| A+ | 80% and above |
| A | 70%–79% |
| B | 60%–69% |
| C | 50%–59% |
| D | 40%–49% |
| F | Below 40% |

MCQ answers are scored automatically. Written answers require teacher review, marks and feedback. Negative marking and result visibility depend on the policies selected for that exam.

## 5. Troubleshooting

| Issue | What to check |
|---|---|
| Cannot sign in | Check the email/password and account role; confirm MongoDB is available |
| No exams appear | Confirm the teacher assigned the exam to this student account and the exam window is correct |
| Exam cannot start | Check that the current time is between the configured start/end times and that an attempt is available |
| Result is missing | Check the release policy and whether written grading is still pending |
| AI question generation fails | Check `GEMINI_API_KEY`, network access, document format/size and provider availability |
| Written file is rejected | Use JPG, PNG, WebP or PDF, and keep each file at or below 8 MB |

If the issue persists, record the page, approximate time and non-sensitive error message. Never include passwords, session cookies, API keys or student answer files in a public issue.
