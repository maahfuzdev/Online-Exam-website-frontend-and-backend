



//Global variables
    let currentMode = 'landing'; // landing, teacher, student, quiz
    let quizQuestions = [];
    let selectedQuestionType = 'general';


    // Quiz state
    let currentQuestionIndex = 0;
    let score = 0;
    let selectedAnswer = null;
    let correctAnswer = null;
    let timeLeft = 30;
    let timer = null;
    let answered = false;
    let isPreviewMode = false;
    let currentQuizType = '';



    // Initialize the application
function init() {

      updateTeacherStats();
  updateStudentStats();
  setupInputFocusEvents();
  document.querySelectorAll('.latex-key').forEach(button => button.addEventListener('click', () => {
    const latex = button.dataset.latex || '';
    insertMathSymbol(latex, Number(button.dataset.cursor || latex.length));
  }));
  document.getElementById('questionBankModal')?.addEventListener('click', event => {
    if (event.target.id === 'questionBankModal') closeQuestionBank();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.getElementById('questionBankModal').classList.contains('hidden')) {
      closeQuestionBank();
    }
  });

      // Add event listeners for real-time preview
  document.querySelectorAll('#questionInput, #choice1, #choice2, #choice3, #choice4')
    .forEach(input => input.addEventListener('input', updateQuestionPreview));

  loadQuestionsFromDB().catch(error => {
        console.log("MongoDB load failed, trying localStorage:", error);
        loadFromLocalStorage();
    });

}



    // Navigation functions
    function showLandingPage() {
      hideAllSections();
      document.getElementById('landingPage').classList.remove('hidden');
      currentMode = 'landing';
    }

    function showTeacherDashboard() {
      hideAllSections();
      const dashboard = document.getElementById('teacherDashboard');
      dashboard.classList.remove('hidden', 'question-creation-mode', 'exam-creation-mode');
      currentMode = 'teacher';
      updateTeacherStats();
      const workspaceMode = localStorage.getItem('teacherWorkspaceMode') || 'all';
      localStorage.removeItem('teacherWorkspaceMode');
      if (workspaceMode === 'questions' || workspaceMode === 'exam') dashboard.classList.add(workspaceMode === 'questions' ? 'question-creation-mode' : 'exam-creation-mode');
      const heading = dashboard.querySelector('.exam-workflow-heading');
      if (heading && workspaceMode !== 'all') {
        heading.querySelector('.workflow-eyebrow').textContent = workspaceMode === 'questions' ? 'QUESTION WORKSPACE' : 'EXAM WORKSPACE';
        heading.querySelector('h2').textContent = workspaceMode === 'questions' ? 'Create questions' : 'Create an exam';
        heading.querySelector('p').textContent = workspaceMode === 'questions'
          ? 'Create and save reusable questions to your question bank.'
          : 'Choose saved questions, set the schedule, and assign students.';
        heading.querySelector('.workflow-summary')?.classList.toggle('hidden', workspaceMode === 'questions');
      }
      if (workspaceMode === 'exam') {
        const bankIntro = dashboard.querySelector('#examStep2 .review-intro-card');
        if (bankIntro) {
          bankIntro.querySelector('.section-title').textContent = 'Exam question setup';
          bankIntro.querySelector('.bank-section-description').textContent = 'Choose the saved questions to include in your exam in the next step.';
          bankIntro.querySelector('.review-bank-launch')?.classList.add('hidden');
          bankIntro.querySelector('#questionsList')?.classList.add('hidden');
        }
      }
      // The dashboard is shown after the page's load event, so exam.js's
      // load-time initializer cannot populate the exam creator here.
      if (typeof initExamCreator === 'function') {
        const requestedStep = Number(localStorage.getItem('teacherWorkspaceStep'));
        localStorage.removeItem('teacherWorkspaceStep');
        Promise.resolve(initExamCreator()).then(() => {
          const step = workspaceMode === 'questions' ? 1 : (workspaceMode === 'exam' ? ([2, 3].includes(requestedStep) ? requestedStep : 2) : requestedStep);
          if ([1, 2, 3].includes(step) && typeof showExamStep === 'function') showExamStep(step);
        });
      }
    }

    function showStudentDashboard() {
      hideAllSections();
      document.getElementById('studentDashboard').classList.remove('hidden');
      currentMode = 'student';
      updateStudentStats();
    }

    function hideAllSections() {
      document.getElementById('landingPage').classList.add('hidden');
      document.getElementById('teacherDashboard').classList.add('hidden');
      document.getElementById('studentDashboard').classList.add('hidden');
      document.getElementById('quizContainer').classList.add('hidden');
    }
