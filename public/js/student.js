
let quizQuestions1 = [];
let studentAnswers = {}; // { questionIndex: optionIndex }
let currentQuestionIndex = 0;
let activeExams = [];
let pastExams = [];
let studentResults = [];
let attemptedExamIds = [];
let attendedExamIds = [];
let submittedExamIds = [];
let examTimerInterval = null;
let pendingResultSave = Promise.resolve();

function studentExamStorageKey(prefix, examId) {
  const studentId = localStorage.getItem("userId") || "guest";
  return `${prefix}_${studentId}_${examId}`;
}











        async function initStudentDashboard() {
  await Promise.all([loadStudentExams(), fetchResult()]);
  renderActiveExams();
  await renderPastExams();
  renderStudentResults();
  document.getElementById("completedExamsCount").textContent = submittedExamIds.length;
  const absentCount = pastExams.filter(exam => !attendedExamIds.includes(String(exam.examId))).length;
  document.getElementById("absentExamsCount").textContent = absentCount;
}


//Exam Load (replace hardcoded activeExams)


async function loadStudentExams() {
  const studentId = localStorage.getItem("userId");
  const res = await fetch(`/assignments/api/exams/student/${studentId}`);
  if (!res.ok) throw new Error("Failed to load exams");
  const examdata = await res.json();

  activeExams = [];
  pastExams = [];
  attendedExamIds = examdata.filter(exam => exam.attended).map(exam => String(exam.examId));
  submittedExamIds = examdata.filter(exam => exam.submitted).map(exam => String(exam.examId));
  examdata.forEach(exam => {
    if (exam.status === "active") activeExams.push(exam);
    else pastExams.push(exam);
  });
}

// Load question from database for students
    async function loadAssignedQuestions(examId) {
      const studentId = localStorage.getItem("userId");


  const res = await fetch(
    `/assignments/api/exam/${examId}/student/${studentId}`
  );

  const questionsData = await res.json();

  quizQuestions1 = questionsData.map(q => ({
    _id: q._id,
    question: q.questionText,
    choices: q.options,
    correct: null
  }));

  currentQuestionIndex = 0;
  const savedAnswers = JSON.parse(localStorage.getItem(studentExamStorageKey('examAnswers', examId)) || '{}');
  studentAnswers = Object.fromEntries(Object.entries(savedAnswers).filter(([index, answer]) =>
    Number(index) >= 0 && Number(index) < quizQuestions1.length && Number(answer) >= 0 && Number(answer) < 4
  ).map(([index, answer]) => [Number(index), Number(answer)]));

  initQuestionsNavigation();
  loadQuestion(0);
}

//fetch student result

async function fetchResult() {
  try {
    const studentId = localStorage.getItem("userId");

    const resResult = await fetch(
      `/results/api/studentsResult/${studentId}`
    );


    const resultData = await resResult.json();

    studentResults = resultData.data || [];




    attemptedExamIds = [...new Set(studentResults.map(result => result.examID?._id || result.examID).filter(Boolean).map(String))];


    document.getElementById("averageScore").textContent = `${resultData.averagePercentage} %`;
    document.getElementById("completedExamsCount").textContent = submittedExamIds.length;


  } catch (err) {
    console.error("Failed to fetch results", err);
  }
}



// Render active exams
function renderActiveExams() {





            const container = document.getElementById('activeExamsList');

            if (!container) return;







  document.getElementById("activeExamsCount").textContent =

    activeExams.length;



  if (activeExams.length === 0) {

    container.innerHTML = `

      <div class="empty-state">

        <i class="fas fa-clipboard-list"></i>

        <h3>No Active Exams</h3>

        <p>You don't have any active exams at the moment.</p>

      </div>

    `;

    return;

  }



            let html = '';

         activeExams.forEach(exam => {



            const endTime = new Date(exam.endTime);

            let statusClass = 'status-active';





                html += `

                    <div class="exam-card active" onclick="startExamById('${exam.examId}')">

                        ${exam.subject ? `<div class="exam-subject">${escapeStudentHtml(exam.subject)}</div>` : ''}
                        <div class="exam-title">${escapeStudentHtml(exam.examTitle)}</div>

                        <div class="exam-meta">

                            <span><i class="fas fa-question-circle"></i> ${exam.questionCount} Questions</span>

                            <span><i class="fas fa-star"></i> ${exam.totalMarks} Marks</span>

                            <span><i class="fas fa-clock"></i> ${exam.examTime}</span>
                            ${exam.negativeMarkingEnabled ? `<span>−${exam.negativeMarkPerWrong} wrong</span>` : ''}

                        </div>

                        <div class="exam-status ${statusClass}">${exam.status}</div>

                        <div style="margin-top: 15px; font-size: 0.9rem; color: #666;">

                            <i class="fas fa-calendar-alt"></i> Available until: ${formatDate(endTime)}

                        </div>

                        <button type="button" class="btn btn-primary" style="margin-top: 15px; width: 100%;" onclick="event.stopPropagation(); startExamById('${exam.examId}')">

                            <i class="fas fa-play-circle"></i> Start Exam

                        </button>

                    </div>

                `;

            });



            container.innerHTML = html;

        }






        // Render past exams
async function renderPastExams() {
  const container = document.getElementById('pastExamsList');
  if (!container) return;

  if (pastExams.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 px-6 bg-gradient-to-br from-indigo-50 to-purple-100 rounded-2xl border border-indigo-200 text-center shadow-lg">
        <div class="w-20 h-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
          <i class="fas fa-history text-3xl text-white"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-700 mb-3">No Past Exams</h3>
        <p class="text-gray-500 max-w-md">You haven't completed any exams yet. Your past exams will appear here once you complete them.</p>
      </div>
    `;
    return;
  }

  let html = '';


  for (const exam of pastExams) {
    const examId = String(exam.examId);
    const studentResult = studentResults.find(result => String(result.examID?._id || result.examID) === examId);
    if (studentResult) {
        const result = studentResult;


        const percentageColor = result.percentage >= 80
          ? 'from-emerald-500 to-teal-600'
          : result.percentage >= 60
            ? 'from-amber-500 to-orange-500'
            : 'from-rose-500 to-pink-600';

        const percentageBadgeColor = result.percentage >= 80
          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
          : result.percentage >= 60
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
            : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg';

        html += `
          <div class="exam-card group relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 transform">
            <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${percentageColor}"></div>

            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <h3 class="text-lg font-bold text-blue-800 mb-2 group-hover:text-indigo-600 transition-colors">${result.examTitle}</h3>
                <div class="flex items-center gap-4 text-sm text-blue-600">
                  <span class="flex items-center gap-1.5">
                    <i class="fas fa-question-circle text-blue-500"></i>
                    <span>${result.totalQuestions} Questions</span>
                  </span>
                  <span class="flex items-center gap-1.5">
                    <i class="fas fa-star text-amber-500"></i>
                    <span>${result.score}/${result.totalMarks} Marks</span>
                  </span>
                </div>
              </div>
              <span class="${percentageBadgeColor} text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg">
                ${result.percentage}%
              </span>
            </div>

            <div class="mb-5">
              <div class="flex justify-between text-xs font-medium text-blue-600 mb-1.5">
                <span>Performance</span>
                <span>${result.percentage}%</span>
              </div>
              <div class="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r ${percentageColor} rounded-full" style="width: ${result.percentage}%"></div>
              </div>
            </div>

            <div class="flex justify-between items-center pt-4 border-t border-blue-100">
              <div class="flex items-center gap-2 text-sm text-blue-500">
                <div class="w-8 h-8 bg-gradient-to-r from-indigo-100 to-purple-50 rounded-lg flex items-center justify-center shadow-inner">
                  <i class="fas fa-calendar-check text-indigo-500 text-xs"></i>
                </div>
                <span>${formatDate(new Date(result.date))}</span>

                <span class="ml-4 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                  <i class="fas fa-check-circle mr-1"></i> Completed
                </span>
              </div>

              <button class="student-review-button past-result-review" type="button" onclick="event.stopPropagation(); switchTab('results'); openResultReview('${examId}')"><i class="fas fa-list-check"></i> Review answers</button>

            </div>

            </div>
        `;
    } else if (attendedExamIds.includes(examId)) {
      const submitted = submittedExamIds.includes(examId);
      const attendanceStatus = submitted ? 'Submitted · Result pending' : 'Attended · not submitted';
      const attendanceMessage = submitted
        ? 'Your submission is recorded. The result will appear here when it is released.'
        : 'Your attendance is recorded, so this exam will not be marked absent. No result is available because the exam was not submitted.';
      html += `<article class="exam-card result-pending-card"><div class="exam-title">${escapeStudentHtml(exam.examTitle)}</div><div class="exam-meta"><span>${exam.questionCount} Questions</span><span>${exam.totalMarks} Marks</span></div><span class="exam-status status-completed">${attendanceStatus}</span><p>${attendanceMessage}</p></article>`;
    }
    // ❌ ABSENT (No change needed here)
    else {
      html += `
        <div class="exam-card relative overflow-hidden bg-gradient-to-br from-red-50 to-pink-50 border border-red-300 rounded-2xl p-6 shadow-lg cursor-not-allowed transition-all duration-300">
          <div class="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-600 to-red-700"></div>

          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <h3 class="text-lg font-bold text-red-800 mb-2">${exam.examTitle}</h3>
              <div class="flex items-center gap-4 text-sm text-red-600">
                <span class="flex items-center gap-1.5">
                  <i class="fas fa-question-circle text-red-400"></i>
                  <span>${exam.questionCount} Questions</span>
                </span>
                <span class="flex items-center gap-1.5">
                  <i class="fas fa-star text-red-400"></i>
                  <span>${exam.totalMarks} Marks</span>
                </span>
              </div>
            </div>
            <span class="bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg">
              Absent
            </span>
          </div>

          <div class="mb-5 p-4 bg-gradient-to-r from-rose-100 to-red-100 border border-rose-300 rounded-xl shadow-inner">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-gradient-to-r from-rose-600 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                <i class="fas fa-times-circle text-white text-lg"></i>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-rose-800 mb-1">Exam Not Attended</h4>
                <p class="text-xs text-rose-700">You missed this exam. It will not affect your overall performance.</p>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t border-red-200">
            <div class="flex items-center gap-2 text-sm text-red-400">
              <div class="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center shadow-inner">
                <i class="fas fa-calendar-times text-red-600 text-xs"></i>
              </div>
              <span>Missed Exam</span>
            </div>
            <button class="bg-gradient-to-r from-red-400 to-rose-500 text-white font-semibold py-2.5 px-6 rounded-xl opacity-80 cursor-not-allowed flex items-center gap-2 shadow-md" disabled>
              <i class="fas fa-ban text-sm"></i>
              Absent
            </button>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}






      // Render student results
function renderStudentResults() {
  const container = document.getElementById('detailedResultsList');
  if (!container) return;
  if (!studentResults.length) {
    container.innerHTML = `<div class="student-empty-state"><span><i class="fas fa-chart-line"></i></span><h3>No results yet</h3><p>When you complete an exam and its result is released, your score and answer review will appear here.</p></div>`;
    return;
  }

  const sortedResults = [...studentResults].sort((a, b) => new Date(b.date || b.generatedAt || 0) - new Date(a.date || a.generatedAt || 0));
  container.innerHTML = `<div class="student-results-grid">${sortedResults.map((result, index) => {
    const score = Number(result.score || 0);
    const total = Number(result.totalMarks || 0);
    const percentage = Number(result.percentage || 0);
    const tone = percentage >= 80 ? 'excellent' : percentage >= 50 ? 'steady' : 'practice';
    const id = escapeStudentHtml(result.examID?._id || result.examID || `result-${index}`);
    return `<article class="student-result-card ${tone}">
      <div class="student-result-card-head"><span class="student-result-icon"><i class="fas fa-file-circle-check"></i></span><span class="student-result-percent">${percentage.toFixed(1)}%</span></div>
      <h3>${escapeStudentHtml(result.examTitle || 'Exam result')}</h3>
      <p class="student-result-date"><i class="far fa-calendar"></i> ${escapeStudentHtml(formatDate(new Date(result.date || result.generatedAt || Date.now())))}</p>
      <div class="student-result-score"><span>Score</span><strong>${score.toFixed(2)} <small>/ ${total.toFixed(2)}</small></strong></div>
      <div class="student-result-counts"><span><b>${Number(result.correctAnswers || 0)}</b> Correct</span><span><b>${Number(result.wrongAnswers || 0)}</b> Wrong</span><span><b>${Number(result.skippedQuestion || 0)}</b> Skipped</span></div>
      <button class="student-review-button" type="button" onclick="openResultReview('${id}')"><i class="fas fa-list-check"></i> Review answers <i class="fas fa-arrow-right"></i></button>
    </article>`;
  }).join('')}</div>`;
}

function openResultReview(examId) {
  const result = studentResults.find(item => String(item.examID?._id || item.examID) === String(examId));
  const container = document.getElementById('detailedResultsList');
  if (!result || !container) return;
  const review = Array.isArray(result.answerReview) ? result.answerReview : [];
  const questionsHtml = review.length ? review.map((item, index) => {
    const options = Array.isArray(item.options) ? item.options : [];
    const correct = Number(item.correctOption);
    const selected = item.selectedOption === null || item.selectedOption === undefined ? null : Number(item.selectedOption);
    const answerLabel = value => Number.isInteger(value) && value >= 0 && value < options.length ? String.fromCharCode(65 + value) : '';
    return `<article class="student-review-question ${item.isCorrect ? 'is-correct' : selected === null ? 'is-skipped' : 'is-wrong'}">
      <header><span class="student-review-number">Question ${index + 1}</span><span class="student-review-status"><i class="fas ${item.isCorrect ? 'fa-circle-check' : selected === null ? 'fa-circle-minus' : 'fa-circle-xmark'}"></i>${item.isCorrect ? 'Correct' : selected === null ? 'Skipped' : 'Incorrect'}</span></header>
      <div class="student-review-question-text review-math"></div>
      <div class="student-review-options">${options.map((option, optionIndex) => {
        const isCorrect = optionIndex === correct;
        const isSelectedWrong = optionIndex === selected && !isCorrect;
        return `<div class="student-review-option ${isCorrect ? 'option-correct' : ''} ${isSelectedWrong ? 'option-selected-wrong' : ''}"><span class="student-review-option-letter">${String.fromCharCode(65 + optionIndex)}</span><span class="student-review-option-text review-math"></span><span class="student-review-option-mark">${isCorrect ? '<i class="fas fa-check"></i> Correct answer' : isSelectedWrong ? '<i class="fas fa-user-check"></i> Your answer' : ''}</span></div>`;
      }).join('')}</div>
      <footer><span><strong>Your answer:</strong> ${selected === null ? 'Not answered' : `Option ${answerLabel(selected)}`}</span><span><strong>Correct answer:</strong> Option ${answerLabel(correct)}</span></footer>
    </article>`;
  }).join('') : `<div class="student-empty-state"><span><i class="fas fa-circle-info"></i></span><h3>Answer review unavailable</h3><p>This result was saved before question-by-question answer review became available.</p></div>`;

  container.innerHTML = `<div class="student-review-page">
    <button type="button" class="student-review-back" onclick="renderStudentResults()"><i class="fas fa-arrow-left"></i> All results</button>
    <section class="student-review-hero"><div><span class="student-review-kicker"><i class="fas fa-book-open"></i> Answer review</span><h3>${escapeStudentHtml(result.examTitle || 'Exam result')}</h3><p>${escapeStudentHtml(formatDate(new Date(result.date || result.generatedAt || Date.now())))} <span>·</span> ${review.length} questions</p></div><div class="student-review-score"><strong>${Number(result.score || 0).toFixed(2)}<small> / ${Number(result.totalMarks || 0).toFixed(2)}</small></strong><span>${Number(result.percentage || 0).toFixed(1)}% score</span></div></section>
    <div class="student-review-summary"><span><i class="fas fa-check"></i><b>${Number(result.correctAnswers || 0)}</b> Correct</span><span><i class="fas fa-xmark"></i><b>${Number(result.wrongAnswers || 0)}</b> Wrong</span><span><i class="fas fa-minus"></i><b>${Number(result.skippedQuestion || 0)}</b> Skipped</span></div>
    <div class="student-review-list">${questionsHtml}</div>
  </div>`;
  container.querySelectorAll('.student-review-question').forEach((card, questionIndex) => {
    const question = review[questionIndex];
    renderStudentQuestionText(card.querySelector('.student-review-question-text'), question.questionText);
    card.querySelectorAll('.student-review-option-text').forEach((element, optionIndex) => {
      renderStudentQuestionText(element, question.options[optionIndex]);
    });
  });
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

        // Switch tabs
        function switchTab(tabName) {
            // Hide all sections
            document.querySelectorAll('.dashboard-section').forEach(section => {
                section.classList.add('hidden');
            });

            // Deactivate all tabs
            document.querySelectorAll('.tab-btn').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected section
            document.getElementById(tabName + 'Section').classList.remove('hidden');

            // Activate selected tab
            document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1))
                .classList.add('active');
        }

        // Start an exam

function startExamById(examId) {
  const exam = activeExams.find(item => String(item.examId) === String(examId));
  if (!exam) return;
  startExam(exam.examId, exam.markPerQuestion, exam.examTime, exam.startTime, exam.teacherID, exam.examTitle, exam);
}

async function startExam(examId, mpq, duration, startTime, teacherID, examTitle, examSettings = {})
{
          let now = new Date();
          localStorage.setItem("currentExamId", examId);
          localStorage.setItem("markPerquestion", mpq);
          localStorage.setItem("duration", duration);
          localStorage.setItem("startTime", startTime);
          localStorage.setItem("teacherID", teacherID);
          localStorage.setItem("examTitle", examTitle);
          localStorage.setItem("negativeMarkingEnabled", String(Boolean(examSettings.negativeMarkingEnabled)));
          localStorage.setItem("negativeMarkPerWrong", Number(examSettings.negativeMarkPerWrong || 0));
          localStorage.setItem("resultVisibility", examSettings.resultVisibility || "immediate");
          localStorage.setItem("resultsReleased", String(Boolean(examSettings.resultsReleased)));
          localStorage.setItem("examEndTime", examSettings.endTime || "");
   const now1 = new Date();
  const examStartTime = new Date(startTime);

  // ❌ exam not started yet
  if (now1 < examStartTime) {
    const diffMs = examStartTime - now;
    const diffMin = Math.ceil(diffMs / 60000);

    alert(`Exam will start in ${diffMin} minute(s). Please wait.`);
    return;
  }

  else if (submittedExamIds.includes(String(examId))) {
    alert("You have already attempted this exam.");
    return;
  }
  else {
    try {
      const response = await fetch(`/assignments/api/exam/${encodeURIComponent(examId)}/attend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: localStorage.getItem('userId') })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not register exam attendance.');
      if (!attendedExamIds.includes(String(examId))) attendedExamIds.push(String(examId));
    } catch (error) {
      alert(error.message || 'Could not register exam attendance. Please try again.');
      return;
    }
    document.getElementById('studentDashboard').classList.add('hidden');
    document.getElementById('examContainer').classList.remove('hidden');

    loadAssignedQuestions(examId);
    // ✅ exam wise
    remainingTime(duration);
  }
}


        // Initialize questions navigation
        function initQuestionsNavigation() {
            const container = document.getElementById('questionsNav');
          const questionsCount = quizQuestions1.length; // For demo
          document.getElementById("examTitleDisplay").textContent = localStorage.getItem("examTitle") || "Exam";
          document.getElementById("questionMarks").textContent = (localStorage.getItem("markPerquestion")) + " marks";
          document.getElementById("examQuestionsCount").textContent = `${questionsCount} Questions`;
          document.getElementById("examTotalMarks").textContent = "Total: " + (questionsCount * localStorage.getItem("markPerquestion")).toFixed(2) + " marks";
          document.getElementById("examTimeRemaining").textContent = `${localStorage.getItem("duration")} min`;

            let html = '';
            for (let i = 0; i < questionsCount; i++) {
                html += `
                    <button type="button" class="question-nav-btn" onclick="loadQuestion(${i})" id="navBtn${i}" aria-label="Question ${i + 1}, not answered">
                        ${i + 1}
                    </button>
                `;
            }

            container.innerHTML = html;
            updateQuestionNavigation(0);
        }

        // Update question navigation
        function updateQuestionNavigation(currentIndex) {
            const allButtons = document.querySelectorAll('.question-nav-btn');
            allButtons.forEach((button, index) => {
                const isAnswered = studentAnswers[index] !== undefined;
                const isCurrent = index === currentIndex;
                button.classList.toggle('answered', isAnswered);
                button.classList.toggle('current', isCurrent);
                button.setAttribute('aria-label', `Question ${index + 1}, ${isAnswered ? 'answered' : 'not answered'}${isCurrent ? ', current question' : ''}`);
                if (isCurrent) button.setAttribute('aria-current', 'step');
                else button.removeAttribute('aria-current');
            });
        }

        // Load question
        function escapeStudentHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, character => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            })[character]);
        }

        function formatStudentQuestionText(value) {
            let text = String(value ?? '');
            // Separate adjacent Bangla and Latin words when the source omitted a space.
            text = text
                .replace(/([A-Za-z])([\u0980-\u09FF])/g, '$1 $2')
                .replace(/([\u0980-\u09FF])([A-Za-z])/g, '$1 $2')
                .replace(/(\$[^$]+\$|\\\([^)]*\\\)|\\\[[\s\S]*?\\\])(?=[A-Za-z\u0980-\u09FF])/g, '$1 ')
                .replace(/([A-Za-z\u0980-\u09FF])(?=\$[^$]+\$|\\\([^)]*\\\)|\\\[[\s\S]*?\\\])/g, '$1 ');

            const latexCommand = String.raw`\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{(?:[^{}]|\{[^{}]*\})*\}){0,2}`;
            const commandPattern = new RegExp(latexCommand, 'g');
            let html = '';
            let lastIndex = 0;
            let match;

            while ((match = commandPattern.exec(text)) !== null) {
                html += escapeStudentHtml(text.slice(lastIndex, match.index));
                const before = text.slice(0, match.index);
                const inDollarMath = (before.match(/(?<!\\)\$/g) || []).length % 2 === 1;
                const inParenMath = before.lastIndexOf('\\(') > before.lastIndexOf('\\)');
                const inBracketMath = before.lastIndexOf('\\[') > before.lastIndexOf('\\]');

                if (inDollarMath || inParenMath || inBracketMath || !window.katex) {
                    html += escapeStudentHtml(match[0]);
                } else {
                    const previousCharacter = text.slice(0, match.index).slice(-1);
                    const nextCharacter = text.slice(match.index + match[0].length, match.index + match[0].length + 1);
                    if (/[A-Za-z\u0980-\u09FF]/.test(previousCharacter) && !/\s$/.test(html)) html += ' ';
                    html += katex.renderToString(match[0], { throwOnError: false, strict: false });
                    if (/[A-Za-z\u0980-\u09FF]/.test(nextCharacter)) html += ' ';
                }
                lastIndex = commandPattern.lastIndex;
            }

            return html + escapeStudentHtml(text.slice(lastIndex));
        }

        function renderStudentQuestionText(element, value) {
            element.innerHTML = formatStudentQuestionText(value);
            if (window.renderMathInElement) {
                renderMathInElement(element, {
                    delimiters: [
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true },
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false }
                    ],
                    throwOnError: false
                });
            }
        }

        function loadQuestion(index) {
            // For demo, just update the UI
            document.getElementById('questionNumberDisplay').textContent = `Question ${index + 1}`;
            document.getElementById('currentQuestionNumber').textContent = `Question ${index + 1}`;
            // Update progress bar
            const progress = ((index + 1) / quizQuestions1.length) * 100;
            document.getElementById('examProgressFill').style.width = `${progress}%`;

            // Update question text

            const questions = quizQuestions1.map(q => q.question);

            renderStudentQuestionText(document.getElementById('questionTextDisplay'), questions[index] || "Question not available");

            // Update options
            const options = quizQuestions1.map(q => q.choices);

            if (options[index]) {
                renderStudentQuestionText(document.getElementById('optionA'), options[index][0] || "Option A");
                renderStudentQuestionText(document.getElementById('optionB'), options[index][1] || "Option B");
                renderStudentQuestionText(document.getElementById('optionC'), options[index][2] || "Option C");
                renderStudentQuestionText(document.getElementById('optionD'), options[index][3] || "Option D");
            }

          updateQuestionNavigation(index);
           updateMCQUI();
        }
// updateMCQUI
function updateMCQUI() {
  const container = document.getElementById('mcqOptions');
  const optionRows = container.querySelectorAll('.option-row');
  const status = document.getElementById('answerStatus');

  const savedAnswer = studentAnswers[currentQuestionIndex];
  optionRows.forEach((row, index) => {
    const selected = index === savedAnswer;
    row.classList.toggle('selected', selected);
    row.setAttribute('aria-checked', String(selected));
    row.tabIndex = savedAnswer === undefined ? (index === 0 ? 0 : -1) : (selected ? 0 : -1);
  });

  if (savedAnswer !== undefined) {
    status.textContent = 'Answer saved';
    status.className = 'answer-status answered';
  } else {
    status.textContent = 'Choose one answer';
    status.className = 'answer-status';
  }

  const answeredCount = Object.keys(studentAnswers).length;
  const progressText = document.getElementById('examProgressText');
  if (progressText) progressText.textContent = `${answeredCount}/${quizQuestions1.length} answered`;
  const previousButton = document.getElementById('prevQuestionBtn');
  const nextButton = document.getElementById('nextQuestionBtn');
  if (previousButton) previousButton.disabled = currentQuestionIndex === 0;
  if (nextButton) {
    const isLastQuestion = currentQuestionIndex === quizQuestions1.length - 1;
    nextButton.textContent = isLastQuestion ? 'Finish exam' : 'Next →';
    nextButton.setAttribute('aria-label', isLastQuestion ? 'Finish exam' : 'Go to next question');
  }
  updateQuestionNavigation(currentQuestionIndex);
}

// Select MCQ option
function selectMCQOption(optionIndex) {
  studentAnswers[currentQuestionIndex] = optionIndex;
  const examId = localStorage.getItem("currentExamId");
  if (examId) localStorage.setItem(studentExamStorageKey('examAnswers', examId), JSON.stringify(studentAnswers));
  updateMCQUI();
}

function handleMCQKeydown(event) {
  const rowCount = document.querySelectorAll('#mcqOptions .option-row').length;
  if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key) || rowCount === 0) return;
  event.preventDefault();
  const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
  const currentAnswer = studentAnswers[currentQuestionIndex] ?? 0;
  const nextAnswer = (currentAnswer + direction + rowCount) % rowCount;
  selectMCQOption(nextAnswer);
  document.querySelectorAll('#mcqOptions .option-row')[nextAnswer].focus();
}




        // Navigation functions


function previousQuestionExam() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion(currentQuestionIndex);
    updateMCQUI();
  }
}

function nextQuestionExam() {
  if (currentQuestionIndex < quizQuestions1.length - 1) {
    currentQuestionIndex++;
    loadQuestion(currentQuestionIndex);
    return;
  }
  confirmSubmitExam();
}



        function confirmSubmitExam() {
            const unanswered = quizQuestions1.length - Object.keys(studentAnswers).length;
            const message = unanswered > 0
              ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit your exam anyway?`
              : 'Submit your exam now? You cannot change your answers after submission.';
            if (confirm(message)) submitExam();
        }

        // Submit exam
async function submitExam() {
  let examid = localStorage.getItem("currentExamId");
  const submitted = localStorage.getItem(studentExamStorageKey('submitted', examid));

if (submitted) {
  alert("You have already submitted this exam!");
  return;
}
  if (examTimerInterval) clearInterval(examTimerInterval);
  localStorage.setItem(studentExamStorageKey('examAnswers', examid), JSON.stringify(studentAnswers));
  const endexamTime = localStorage.getItem("endexamTime");
  const duration = Number(localStorage.getItem("duration")); // minutes
  const now = new Date().getTime();

  const totalDuration = duration * 60; // in seconds
  const remainingSeconds = Math.ceil((endexamTime - now) / 1000);
  const timeTaken = totalDuration - remainingSeconds; // seconds
  document.getElementById("timeTaken").textContent = timeTaken;

  localStorage.setItem("timeTaken", timeTaken);

  showExamResults(false, 'Saving your submission…');

  // send result to backend
  pendingResultSave = sendResultToDB(timeTaken).then(payload => {
    localStorage.setItem(studentExamStorageKey('submitted', examid), "true");
    const normalizedExamId = String(payload.result?.examID?._id || payload.result?.examID || examid);
    if (!submittedExamIds.includes(normalizedExamId)) submittedExamIds.push(normalizedExamId);
    if (!attemptedExamIds.includes(normalizedExamId)) attemptedExamIds.push(normalizedExamId);
    if (payload.result) {
      payload.result.answerReview?.forEach((review, index) => {
        if (quizQuestions1[index]) quizQuestions1[index].correct = review.correctOption;
      });
      if (!studentResults.some(result => String(result.examID?._id || result.examID) === normalizedExamId)) studentResults.push(payload.result);
      localStorage.setItem("totalMarks", payload.result.score);
      localStorage.setItem("totalCorrect", payload.result.correctAnswers);
      localStorage.setItem("totalWrong", payload.result.wrongAnswers);
      localStorage.setItem("totalSkipped", payload.result.skippedQuestion);
      localStorage.setItem("percentage", payload.result.percentage);
      document.getElementById('scoreDetails').textContent = `${payload.result.score} / ${payload.result.totalMarks}`;
      document.getElementById('finalScoreDisplay').textContent = `${payload.result.percentage}%`;
      document.getElementById('correctAnswers').textContent = payload.result.correctAnswers;
      document.getElementById('wrongAnswers').textContent = payload.result.wrongAnswers;
      document.getElementById('skipedAnswer').textContent = payload.result.skippedQuestion;
      showExamResults(true, '', Array.isArray(payload.result.answerReview) && payload.result.answerReview.length === quizQuestions1.length);
    } else {
      showExamResults(false, resultReleaseMessage(payload.resultVisibility, payload.resultsReleased));
    }
    document.getElementById("completedExamsCount").textContent = submittedExamIds.length;
  }).catch(error => {
    console.error("Failed to save exam result:", error);
    alert("Your answers are shown, but the result could not be saved. Please check your connection and contact your teacher before leaving this page.");
    throw error;
  });
  try { await pendingResultSave; } catch (_) { /* Keep the result view open so the student sees the save warning. */ }
}

        // Show exam results
        function resultReleaseMessage(policy, released) {
            if (policy === 'teacher_release' && !released) return 'Your exam is submitted. Your teacher will release the result when it is ready.';
            if (policy === 'after_exam_end') return 'Your exam is submitted. Your score and answer review will be available after the scheduled exam end time.';
            return 'Your submission is saved. Results are not available yet.';
        }

        function showExamResults(revealResult = true, message = '', revealReview = revealResult) {
            document.getElementById('examContainer').classList.add('hidden');
            document.getElementById('resultsContainer').classList.remove('hidden');
            document.querySelector('.results-summary .main-score')?.classList.toggle('hidden', !revealResult);
            document.querySelector('.results-summary .result-stats')?.classList.toggle('hidden', !revealResult);
            document.querySelector('.detailed-results')?.classList.toggle('hidden', !revealResult || !revealReview);
            const notice = document.getElementById('resultReleaseNotice');
            notice?.classList.toggle('hidden', revealResult);
            if (notice && !revealResult) notice.textContent = message || resultReleaseMessage(localStorage.getItem('resultVisibility'), localStorage.getItem('resultsReleased') === 'true');
            if (revealResult && revealReview) displayQuestionAnalysis();
        }

        // Display question analysis
function displayQuestionAnalysis() {
  const markPerQuestion = Number(localStorage.getItem("markPerquestion"));



  let totalMarks = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalSkipped = 0;

  const container = document.getElementById('questionAnalysis');
  let html = '';

  quizQuestions1.forEach((q, i) => {
    const studentAnswer = studentAnswers[i];
    const isCorrect = studentAnswer === q.correct;

    let obtainedMark = 0;

    if (studentAnswer === undefined) {
      totalSkipped++;
    } else if (isCorrect) {
      obtainedMark = markPerQuestion;
      totalCorrect++;
    } else {
      totalWrong++;
      if (localStorage.getItem('negativeMarkingEnabled') === 'true') obtainedMark = -Number(localStorage.getItem('negativeMarkPerWrong') || 0);
    }

    totalMarks += obtainedMark;

    html += `
      <div class="question-analysis-item ${isCorrect ? 'correct' : studentAnswer === undefined ? '' : 'incorrect'}">
        <div style="display:flex; justify-content:space-between;">
          <strong>Question ${i + 1}</strong>
          <span class="marks-badge">${obtainedMark} / ${markPerQuestion} mark</span>
        </div>
        <p class="result-question-text result-math">${escapeStudentHtml(q.question || '')}</p>
        <div class="analysis-answer-list">
          <p><strong>Your answer</strong><span class="result-math">${studentAnswer !== undefined ? `Option ${String.fromCharCode(65 + studentAnswer)}: ${escapeStudentHtml(q.choices[studentAnswer] || '')}` : 'Not answered'}</span></p>
          <p><strong>Correct answer</strong><span class="result-math">Option ${String.fromCharCode(65 + q.correct)}: ${escapeStudentHtml(q.choices[q.correct] || '')}</span></p>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  container.querySelectorAll('.result-math').forEach(element => renderStudentQuestionText(element, element.textContent));

  totalMarks = Math.max(0, totalMarks);
  const totalPossibleMarks = (quizQuestions1.length * markPerQuestion).toFixed(2);
  const percentage =
    totalPossibleMarks > 0 ? ((totalMarks / totalPossibleMarks) * 100).toFixed(2) : 0;

  document.getElementById('scoreDetails').textContent =
    `${totalMarks} / ${totalPossibleMarks}`;
  document.getElementById("finalScoreDisplay").textContent = `${percentage}%`;
  document.getElementById("correctAnswers").textContent = totalCorrect;
  document.getElementById("wrongAnswers").textContent = totalWrong;
  document.getElementById("skipedAnswer").textContent = totalSkipped;

  // Save all result in localStorage
  localStorage.setItem("totalMarks", totalMarks);
  localStorage.setItem("totalCorrect", totalCorrect);
  localStorage.setItem("totalWrong", totalWrong);
  localStorage.setItem("totalSkipped", totalSkipped);
  localStorage.setItem("percentage", percentage);
}

//send result to database

async function sendResultToDB(timeTaken) {
  const stId = localStorage.getItem("userId");
  const teacherID = localStorage.getItem("teacherID");
  const examID = localStorage.getItem("currentExamId");
  const examTitle = localStorage.getItem("examTitle");

  const totalCorrect = Number(localStorage.getItem("totalCorrect"));
  const totalWrong = Number(localStorage.getItem("totalWrong"));
  const totalMarks = Number(localStorage.getItem("totalMarks"));
  const percentage = Number(localStorage.getItem("percentage"));
  const totalSkipped = Number(localStorage.getItem("totalSkipped"));
  const markPerQuestion = Number(localStorage.getItem("markPerquestion"));

const stuResult = {
  studentID: stId,
  teacherID: teacherID,
  examID: examID,
  examTitle: examTitle,
  totalQuestions: quizQuestions1.length,
  score: totalMarks,
  totalMarks: markPerQuestion * quizQuestions1.length,
  percentage: percentage,
  correctAnswers: totalCorrect,
  skippedQuestion:totalSkipped,
  wrongAnswers: totalWrong,
  timeTaken: timeTaken,
  date: new Date(),
  answers: studentAnswers
};

  console.log("result", JSON.stringify(stuResult));

    const res = await fetch("/results/api/studentresult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stuResult)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.success || !payload.result) {
      throw new Error(payload.message || "Result could not be saved.");
    }
    return payload;
  }


//exam dynamic timing

function remainingTime(duration) {
  // exam start time = এখনকার সময়
  const start = new Date().getTime(); // timestamp in ms
  const Duration = duration * 60 * 1000; // convert minutes to ms

  const endexamTime = start + Duration;
  localStorage.setItem("endexamTime", endexamTime);

  const timerElement = document.getElementById("examTimeRemaining");
  document.getElementById('timeWarning')?.classList.add('hidden');

  if (examTimerInterval) clearInterval(examTimerInterval);
  examTimerInterval = setInterval(() => {
    const now = new Date().getTime();
    const remaining = endexamTime - now;

    if (remaining <= 0) {
      clearInterval(examTimerInterval);
      timerElement.textContent = "00:00";
      submitExam(); // auto submit when time ends
      return;
    }

    const minutes = Math.floor((remaining / 1000) / 60);
    const seconds = Math.floor((remaining / 1000) % 60);

    timerElement.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    const warning = document.getElementById('timeWarning');
    if (warning && remaining <= 5 * 60 * 1000) {
      warning.classList.remove('hidden');
      document.getElementById('timeWarningText').textContent = remaining <= 60 * 1000
        ? 'Less than one minute left. Review and submit your answers.'
        : 'Five minutes remaining. Review unanswered questions.';
    }
  }, 1000);
}





        // Back to dashboard
        async function backToDashboard() {
            try { await pendingResultSave; } catch (_) { /* Refresh from the server even if saving failed. */ }
            document.getElementById('examContainer').classList.add('hidden');
            document.getElementById('resultsContainer').classList.add('hidden');
            document.getElementById('studentDashboard').classList.remove('hidden');
            await Promise.all([loadStudentExams(), fetchResult()]);
            renderActiveExams();
            await renderPastExams();
            renderStudentResults();
            document.getElementById("completedExamsCount").textContent = submittedExamIds.length;
            const absentCount = pastExams.filter(exam => !attendedExamIds.includes(String(exam.examId))).length;
            document.getElementById("absentExamsCount").textContent = absentCount;
        }

        // Show landing page
        function showLandingPage() {
            window.location.href = "/html/index.html";
        }

        // Utility functions
        function formatDate(date) {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });



}

        function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}


// function viewDetailedResult(examId) {
//             alert(`Viewing detailed analysis for exam: ${examId}`);
//         }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function () {
          initStudentDashboard();
          //student name display

          let studentName = localStorage.getItem('userName');
          document.getElementById('studentName').textContent = studentName;
        });
