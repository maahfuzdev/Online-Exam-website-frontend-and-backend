function openTeacherWorkspace(step) {
  localStorage.setItem('showteacher', 'true');
  localStorage.setItem('teacherWorkspaceStep', String(step));
  window.location.href = '/html/index.html';
}

function goToManualQuestionCreation() {
  openTeacherWorkspace(1);
}

function goToManualExamCreation() {
  goToManualQuestionCreation();
}

function openExamCreation() {
  openTeacherWorkspace(2);
}

function showOCRSystem() {
  window.location.href = '/html/ocrsystem.html';
}
