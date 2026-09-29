



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
      document.getElementById('teacherDashboard').classList.remove('hidden');
      currentMode = 'teacher';
      updateTeacherStats();
      // The dashboard is shown after the page's load event, so exam.js's
      // load-time initializer cannot populate the exam creator here.
      if (typeof initExamCreator === 'function') {
        const requestedStep = Number(localStorage.getItem('teacherWorkspaceStep'));
        localStorage.removeItem('teacherWorkspaceStep');
        Promise.resolve(initExamCreator()).then(() => {
          if ([1, 2, 3].includes(requestedStep) && typeof showExamStep === 'function') showExamStep(requestedStep);
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
