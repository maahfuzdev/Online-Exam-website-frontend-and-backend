function goToManualExamCreation() {
  localStorage.setItem('showteacher', 'true');
  window.location.href = '/html/index.html';
}

function showOCRSystem() {
  alert('Redirecting to OCR exam creation page...');
  window.location.href = '/html/ocrsystem.html';
}
