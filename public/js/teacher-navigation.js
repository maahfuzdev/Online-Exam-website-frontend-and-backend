function openTeacherWorkspace(step, mode) {
  localStorage.setItem('showteacher', 'true');
  localStorage.setItem('teacherWorkspaceStep', String(step));
  localStorage.setItem('teacherWorkspaceMode', mode || 'exam');
  window.location.href = '/';
}

function goToManualQuestionCreation() {
  openTeacherWorkspace(1, 'questions');
}

function goToManualExamCreation() {
  goToManualQuestionCreation();
}

function openExamCreation() {
  switchTab('exams');
}

function showOCRSystem() {
  window.location.href = '/teacher/questions/ocr';
}
