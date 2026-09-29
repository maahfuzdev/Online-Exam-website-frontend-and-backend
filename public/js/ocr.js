(() => {
  const $ = (id) => document.getElementById(id);
  const state = { file: null, questions: [], savedQuestionIds: [], students: [], generating: false, saving: false };

  document.addEventListener('DOMContentLoaded', () => {
    if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    $('sourceFile').addEventListener('change', (event) => setFile(event.target.files?.[0]));
    $('removeFile').addEventListener('click', clearFile);
    $('dropzone').addEventListener('dragover', (event) => { event.preventDefault(); $('dropzone').classList.add('dragging'); });
    $('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('dragging'));
    $('dropzone').addEventListener('drop', (event) => { event.preventDefault(); $('dropzone').classList.remove('dragging'); setFile(event.dataTransfer.files?.[0]); });
    $('generateButton').addEventListener('click', generateQuestions);
    $('backButton').addEventListener('click', () => { $('reviewPanel').classList.add('hidden'); $('uploadPanel').classList.remove('hidden'); setStep(1); });
    $('saveButton').addEventListener('click', saveQuestions);
    $('createExamButton').addEventListener('click', openExamSetup);
    $('examForm').addEventListener('submit', createExam);
    $('toggleStudents').addEventListener('click', toggleStudents);
    $('examDialog').addEventListener('click', (event) => { if (event.target === $('examDialog')) $('examDialog').close(); });
  });

  function setFile(file) {
    if (!file) return;
    const accepted = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!accepted.includes(file.type) || file.size > 10 * 1024 * 1024) {
      showStatus('statusMessage', 'Choose a PDF or PNG, JPG, WEBP image smaller than 10 MB.', true);
      $('sourceFile').value = '';
      return;
    }
    state.file = file;
    state.questions = [];
    state.savedQuestionIds = [];
    $('fileName').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
    $('fileChip').classList.remove('hidden');
    $('uploadTitle').textContent = 'File ready to process';
    $('uploadHint').textContent = file.name;
    clearStatus('statusMessage');
  }

  function clearFile() {
    state.file = null;
    $('sourceFile').value = '';
    $('fileChip').classList.add('hidden');
    $('uploadTitle').textContent = 'Choose a PDF or image';
    $('uploadHint').textContent = 'Tap to browse or drag a file here';
  }

  async function extractPdfText(file) {
    try {
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str).join(' '));
      }
      return pages.join('\n').replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.warn('PDF text extraction failed; sending the PDF for visual processing.', error);
      return '';
    }
  }

  async function generateQuestions() {
    const teacherId = localStorage.getItem('userId');
    const subject = $('subject').value.trim();
    const className = $('className').value.trim();
    if (localStorage.getItem('role') !== 'teacher' || !teacherId) return showStatus('statusMessage', 'Please sign in with a teacher account first.', true);
    if (!state.file) return showStatus('statusMessage', 'Upload a PDF or image to continue.', true);
    if (!subject || !className) return showStatus('statusMessage', 'Add the subject and class so these questions are easy to find.', true);

    state.generating = true;
    const button = $('generateButton');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reading material and creating questions…';
    showStatus('statusMessage', state.file.type === 'application/pdf' ? 'Reading PDF pages. Scanned pages are supported too.' : 'Reading the image and creating questions.');
    try {
      const body = { teacherId, subject, class: className, language: $('language').value, count: Number($('count').value) };
      if (state.file.type === 'application/pdf') {
        const text = await extractPdfText(state.file);
        if (text.length > 100) body.text = text;
        else body.file = { mimeType: state.file.type, data: await toBase64(state.file) };
      } else {
        body.file = { mimeType: state.file.type, data: await toBase64(state.file) };
      }
      const response = await fetch('/api/ocr/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate questions.');
      state.questions = data.questions.map(question => ({ question: question.question, options: question.options, correctAnswer: question.correctAnswer }));
      state.savedQuestionIds = [];
      renderQuestions();
      $('uploadPanel').classList.add('hidden');
      $('reviewPanel').classList.remove('hidden');
      $('savedNote').classList.add('hidden');
      $('saveButton').disabled = false;
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      showStatus('statusMessage', error.message || 'Question generation failed. Please try again.', true);
    } finally {
      state.generating = false;
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate questions';
    }
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read the uploaded file.'));
      reader.readAsDataURL(file);
    });
  }

  function renderQuestions() {
    $('questionCount').textContent = `${state.questions.length} ${state.questions.length === 1 ? 'question' : 'questions'}`;
    $('reviewList').innerHTML = state.questions.map((question, index) => `
      <article class="question-card" data-index="${index}">
        <div class="question-card-top"><span class="question-number">${String(index + 1).padStart(2, '0')}</span><span class="answer-hint"><i class="fa-solid fa-circle-check"></i> Choose the correct answer</span></div>
        <label class="field question-field">Question<textarea data-field="question" rows="2" maxlength="1200">${escapeHtml(question.question)}</textarea></label>
        <div class="option-editor">${question.options.map((option, optionIndex) => `
          <label class="option-input ${question.correctAnswer === String.fromCharCode(65 + optionIndex) ? 'is-correct' : ''}">
            <input type="radio" name="correct-${index}" value="${String.fromCharCode(65 + optionIndex)}" ${question.correctAnswer === String.fromCharCode(65 + optionIndex) ? 'checked' : ''} aria-label="Mark option ${String.fromCharCode(65 + optionIndex)} as correct">
            <span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span>
            <input data-option="${optionIndex}" value="${escapeAttr(option)}" maxlength="500" aria-label="Option ${String.fromCharCode(65 + optionIndex)}">
          </label>`).join('')}
        </div>
      </article>`).join('');
    $('reviewList').querySelectorAll('.question-card').forEach(card => {
      card.querySelectorAll('[data-field="question"], [data-option]').forEach(input => input.addEventListener('input', () => syncQuestion(card)));
      card.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', () => syncQuestion(card)));
    });
  }

  function syncQuestion(card) {
    const index = Number(card.dataset.index);
    state.questions[index].question = card.querySelector('[data-field="question"]').value.trim();
    state.questions[index].options = [...card.querySelectorAll('[data-option]')].map(input => input.value.trim());
    state.questions[index].correctAnswer = card.querySelector('input[type="radio"]:checked')?.value || 'A';
    card.querySelectorAll('.option-input').forEach(label => label.classList.toggle('is-correct', label.querySelector('input[type="radio"]').checked));
  }

  async function saveQuestions() {
    if (state.savedQuestionIds.length === state.questions.length) return state.savedQuestionIds;
    for (const card of $('reviewList').querySelectorAll('.question-card')) syncQuestion(card);
    if (state.questions.some(question => !question.question || question.options.some(option => !option))) {
      showStatus('reviewStatus', 'Every question and all four answer options are required.', true);
      return null;
    }
    if (state.questions.length !== $('reviewList').querySelectorAll('.question-card').length) return null;
    state.saving = true;
    $('saveButton').disabled = true;
    $('createExamButton').disabled = true;
    $('saveButton').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
    try {
      const response = await fetch('/api/questions/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: localStorage.getItem('userId'), subject: $('subject').value.trim(), class: $('className').value.trim(), questions: state.questions.map(question => ({ questionText: question.question, options: question.options, correctAnswer: question.correctAnswer })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Questions could not be saved.');
      state.savedQuestionIds = data.questions.map(question => question._id);
      $('reviewList').querySelectorAll('input, textarea').forEach(input => { input.disabled = true; });
      $('savedNote').classList.remove('hidden');
      $('saveButton').innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved to question bank';
      $('createExamButton').disabled = false;
      clearStatus('reviewStatus');
      return state.savedQuestionIds;
    } catch (error) {
      showStatus('reviewStatus', error.message, true);
      $('saveButton').disabled = false;
      $('createExamButton').disabled = false;
      $('saveButton').innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Save questions';
      return null;
    } finally { state.saving = false; }
  }

  async function openExamSetup() {
    const questionIds = await saveQuestions();
    if (!questionIds) return;
    $('examTitle').value = `${$('subject').value.trim()} · ${$('className').value.trim()} Exam`;
    const now = new Date(Date.now() + 5 * 60 * 1000);
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    $('startTime').value = toLocalDateTime(now);
    $('endTime').value = toLocalDateTime(later);
    $('examStatus').classList.add('hidden');
    $('examDialog').showModal();
    loadStudents();
  }

  async function loadStudents() {
    $('studentList').innerHTML = '<div class="student-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading students…</div>';
    try {
      const response = await fetch('/assignments/api/students');
      if (!response.ok) throw new Error('Could not load students.');
      state.students = (await response.json()).filter(student => student.class?.trim().toLowerCase() === $('className').value.trim().toLowerCase());
      $('studentCount').textContent = `${state.students.length} ${state.students.length === 1 ? 'student' : 'students'} in ${$('className').value.trim()}`;
      $('studentList').innerHTML = state.students.length ? state.students.map(student => `
        <label class="student-row"><input type="checkbox" name="student" value="${escapeAttr(student._id)}"><span class="student-avatar">${escapeHtml((student.name || '?').slice(0, 1).toUpperCase())}</span><span class="student-details"><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.email || student.class || '')}</small></span></label>`).join('') : '<div class="student-empty">No students found in this class. Add students from your dashboard first.</div>';
    } catch (error) {
      $('studentCount').textContent = 'Student list unavailable';
      $('studentList').innerHTML = `<div class="student-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function toggleStudents() {
    const boxes = [...$('studentList').querySelectorAll('input[type="checkbox"]')];
    const selectAll = boxes.some(box => !box.checked);
    boxes.forEach(box => { box.checked = selectAll; });
    $('toggleStudents').textContent = selectAll ? 'Clear selection' : 'Select all';
  }

  async function createExam(event) {
    event.preventDefault();
    const studentIDs = [...$('studentList').querySelectorAll('input:checked')].map(input => input.value);
    if (!studentIDs.length) return showStatus('examStatus', 'Select at least one student for this exam.', true);
    const startTime = new Date($('startTime').value);
    const endTime = new Date($('endTime').value);
    const duration = Number($('duration').value);
    const marksPerQuestion = Number($('marksPerQuestion').value);
    if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime()) || endTime <= startTime || startTime < new Date(Date.now() - 60000)) return showStatus('examStatus', 'Set a valid exam start and end time in the future.', true);
    const button = $('publishExam');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating exam…';
    try {
      const response = await fetch('/assignments/api/assigned-questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherID: localStorage.getItem('userId'), studentIDs, examTitle: $('examTitle').value.trim(), subject: $('subject').value.trim(), questionIds: state.savedQuestionIds, startTime: startTime.toISOString(), endTime: endTime.toISOString(), examTime: duration, markPerQuestion: marksPerQuestion, totalMarks: state.questions.length * marksPerQuestion })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Exam could not be created.');
      $('examDialog').close();
      $('reviewPanel').insertAdjacentHTML('beforeend', '<div class="success-banner"><i class="fa-solid fa-circle-check"></i><span><strong>Exam created and assigned.</strong> It is saved and ready for your students.</span><a href="/teacher/dashboard">Go to dashboard <i class="fa-solid fa-arrow-right"></i></a></div>');
    } catch (error) {
      showStatus('examStatus', error.message, true);
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Create and assign exam';
    }
  }

  function setStep(active) { document.querySelectorAll('.step').forEach(step => step.classList.toggle('active', Number(step.dataset.step) <= active)); }
  function toLocalDateTime(date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function escapeAttr(value) { return escapeHtml(value); }
  function showStatus(id, message, error = false) { const element = $(id); element.textContent = message; element.classList.remove('hidden', 'error'); if (error) element.classList.add('error'); }
  function clearStatus(id) { const element = $(id); if (element) { element.classList.add('hidden'); element.textContent = ''; } }
})();
