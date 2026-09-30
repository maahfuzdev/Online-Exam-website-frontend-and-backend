const selectedQuestionPaperIds = new Set();
let questionPaperPreviewTimer = null;

function scheduleQuestionPaperPreview() {
  clearTimeout(questionPaperPreviewTimer);
  questionPaperPreviewTimer = setTimeout(renderQuestionPaperPreview, 120);
}

function getQuestionPaperSelection() {
  const selected = [...selectedQuestionPaperIds];
  return selected.map(id => allQuestions.find(question => String(question._id) === String(id))).filter(Boolean);
}

function updateQuestionPaperSelectionSummary() {
  const count = document.getElementById('paperSelectionCount');
  const button = document.getElementById('openPaperBuilderButton');
  const size = selectedQuestionPaperIds.size;
  if (count) count.textContent = `${size} selected`;
  if (button) button.disabled = size === 0;
}

function toggleQuestionPaperSelection(questionId, checked) {
  if (checked) selectedQuestionPaperIds.add(String(questionId));
  else selectedQuestionPaperIds.delete(String(questionId));
  updateQuestionPaperSelectionSummary();
}

function selectVisibleBankQuestions() {
  document.querySelectorAll('#teacherQuestionBankList .teacher-bank-select').forEach(input => {
    selectedQuestionPaperIds.add(String(input.value));
    input.checked = true;
  });
  updateQuestionPaperSelectionSummary();
}

function clearBankQuestionSelection() {
  selectedQuestionPaperIds.clear();
  document.querySelectorAll('#teacherQuestionBankList .teacher-bank-select').forEach(input => { input.checked = false; });
  updateQuestionPaperSelectionSummary();
}

function openQuestionPaperBuilder() {
  const questions = getQuestionPaperSelection();
  if (!questions.length) return;
  const subjects = [...new Set(questions.map(question => question.subject).filter(Boolean))];
  const classes = [...new Set(questions.map(question => question.class).filter(Boolean))];
  document.getElementById('paperSubject').value = '';
  document.getElementById('paperClass').value = '';
  if (subjects.length === 1) document.getElementById('paperSubject').value = subjects[0];
  if (classes.length === 1) document.getElementById('paperClass').value = classes[0];
  const today = new Date();
  document.getElementById('paperDate').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dialog = document.getElementById('questionPaperDialog');
  renderQuestionPaperPreview();
  dialog.showModal();
}

function closeQuestionPaperBuilder() {
  document.getElementById('questionPaperDialog')?.close();
}

function createPaperText(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderQuestionPaperPreview() {
  const preview = document.getElementById('questionPaperPreview');
  if (!preview) return;
  const questions = getQuestionPaperSelection();
  const fontSize = Number(document.getElementById('paperFontSize').value || 12);
  const columns = Number(document.getElementById('paperColumns').value || 2);
  const marksPerQuestion = Number(document.getElementById('paperMarksPerQuestion').value || 0);
  const heading = document.getElementById('paperHeading').value.trim() || 'Examination';
  preview.style.setProperty('--paper-font-size', `${fontSize}pt`);
  preview.style.setProperty('--paper-columns', String(columns));
  preview.replaceChildren();
  document.getElementById('paperFontSizeValue').value = `${fontSize} pt`;
  document.getElementById('paperFontSizeValue').textContent = `${fontSize} pt`;
  document.getElementById('paperPreviewQuestionCount').textContent = `${questions.length} question${questions.length === 1 ? '' : 's'}`;

  const paperHeader = document.createElement('header');
  paperHeader.className = 'paper-heading';
  const institution = document.getElementById('paperInstitution').value.trim();
  if (institution) paperHeader.append(createPaperText('p', 'paper-institution', institution));
  paperHeader.append(createPaperText('h1', 'paper-title', heading));
  const examType = document.getElementById('paperExamType').value.trim();
  if (examType) paperHeader.append(createPaperText('p', 'paper-exam-type', examType));
  preview.append(paperHeader);

  const meta = document.createElement('div');
  meta.className = 'paper-meta';
  const subject = document.getElementById('paperSubject').value.trim();
  const className = document.getElementById('paperClass').value.trim();
  const dateValue = document.getElementById('paperDate').value;
  const dateText = dateValue ? new Date(`${dateValue}T00:00:00`).toLocaleDateString() : '';
  const totalMarks = Number((questions.length * marksPerQuestion).toFixed(2));
  const firstMetaRow = document.createElement('div');
  firstMetaRow.className = 'paper-meta-row';
  [subject && `Subject: ${subject}`, className && `Class: ${className}`]
    .filter(Boolean).forEach(item => firstMetaRow.append(createPaperText('span', '', item)));
  if (firstMetaRow.childElementCount) meta.append(firstMetaRow);
  const secondMetaRow = document.createElement('div');
  secondMetaRow.className = 'paper-meta-row';
  [`Time: ${document.getElementById('paperDuration').value.trim() || '--'}`, `Full marks: ${totalMarks}`, dateText && `Date: ${dateText}`]
    .filter(Boolean).forEach(item => secondMetaRow.append(createPaperText('span', '', item)));
  meta.append(secondMetaRow);
  preview.append(meta);

  if (document.getElementById('paperShowStudentFields').checked) {
    const studentLine = document.createElement('div');
    studentLine.className = 'paper-student-fields';
    studentLine.append(createPaperText('span', '', 'Student name: ______________________________'), createPaperText('span', '', 'Roll: ______________'));
    preview.append(studentLine);
  }
  const instructions = document.getElementById('paperInstructions').value.trim();
  if (instructions) preview.append(createPaperText('p', 'paper-instructions', `Instructions: ${instructions}`));

  const questionList = document.createElement('section');
  questionList.className = 'paper-questions';
  questions.forEach((question, index) => {
    const item = document.createElement('article');
    item.className = 'paper-question';
    const questionHead = document.createElement('div');
    questionHead.className = 'paper-question-head';
    questionHead.append(createPaperText('strong', 'paper-question-number', `${index + 1}.`));
    questionHead.append(createPaperText('span', 'paper-question-marks', `[${marksPerQuestion} mark${marksPerQuestion === 1 ? '' : 's'}]`));
    const prompt = createPaperText('div', 'paper-question-text', question.questionText || 'Question text unavailable');
    item.append(questionHead, prompt);
    if (question.answerType !== 'written' && Array.isArray(question.options) && question.options.length) {
      const options = document.createElement('div');
      options.className = 'paper-options';
      const bengaliOptionLabels = ['ক', 'খ', 'গ', 'ঘ'];
      question.options.forEach((option, optionIndex) => {
        const optionItem = document.createElement('div');
        optionItem.className = 'paper-option';
        optionItem.append(createPaperText('strong', 'paper-option-label', `${bengaliOptionLabels[optionIndex] || `${optionIndex + 1}`}.`));
        optionItem.append(createPaperText('span', '', option));
        options.append(optionItem);
      });
      item.append(options);
    }
    questionList.append(item);
  });
  preview.append(questionList);

  if (window.renderMathInElement) window.renderMathInElement(preview, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }],
    throwOnError: false
  });
}

function printQuestionPaper() {
  renderQuestionPaperPreview();
  const source = document.getElementById('questionPaperPreview');
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Allow pop-ups for this site to print or save the question paper as PDF.');
    return;
  }
  const title = document.getElementById('paperHeading').value.trim() || 'Examination';
  const root = document.createElement('main');
  root.className = 'question-paper-preview';
  root.style.setProperty('--paper-font-size', source.style.getPropertyValue('--paper-font-size'));
  root.style.setProperty('--paper-columns', source.style.getPropertyValue('--paper-columns'));
  root.innerHTML = source.innerHTML;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapePaperHtml(title)}</title><link rel="stylesheet" href="/css/question-paper.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"></head><body></body></html>`);
  printWindow.document.close();
  printWindow.document.body.append(root);
  let printed = false;
  const printOnce = () => {
    if (printed || printWindow.closed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
  };
  printWindow.addEventListener('load', () => setTimeout(printOnce, 350), { once: true });
  setTimeout(printOnce, 1200);
}

function escapePaperHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.getElementById('questionPaperDialog')?.close();
});
