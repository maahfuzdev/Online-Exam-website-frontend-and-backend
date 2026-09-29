// Small compatibility helpers for the exam assignment UI on teacherdash.html.
var quizQuestions = [];

function hasMathContent(text) {
  return String(text || '').includes('$') || String(text || '').includes('\\') || /[\u2200-\u22FF\u2190-\u21FF\u25A0-\u25FF]/.test(String(text || ''));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
