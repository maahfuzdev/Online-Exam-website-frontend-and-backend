// Backward-compatible entry point for pages that still load the original script path.
// New pages should load the feature scripts directly in this order.
[
  'core.js',
  'question-tools.js',
  'question-bank.js',
  'quiz.js',
  'app-init.js',
  'exam.js'
].forEach((file) => document.write(`<script src="/js/${file}"><\/script>`));
