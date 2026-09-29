let teacherExamTabReady = false;
let teacherExamScriptsPromise = null;

function loadTeacherExamScripts() {
  if (teacherExamScriptsPromise) return teacherExamScriptsPromise;
  teacherExamScriptsPromise = ['/js/teacher-exam-prerequisites.js', '/js/exam.js'].reduce((chain, source) => chain.then(() => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Exam tools could not be loaded.'));
    document.body.appendChild(script);
  })), Promise.resolve());
  return teacherExamScriptsPromise;
}

async function initializeTeacherExamTab() {
  if (teacherExamTabReady) {
    await loadExistingExams();
    return;
  }

  const examPanel = document.getElementById('examStep3');
  if (!examPanel) return;
  examPanel.classList.remove('hidden');

  try {
    await loadTeacherExamScripts();
    await initExamCreator();
    teacherExamTabReady = true;
  } catch (error) {
    console.error('Could not initialize exam assignment:', error);
    showMessage(error.message || 'Could not load exam setup data.', 'error');
  }
}
