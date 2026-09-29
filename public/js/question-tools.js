// Math functions




let activeInputId = 'questionInput';
let questionBankReturnFocus = null;

function setupInputFocusEvents() {
    const inputs = [  // ভ্যারিয়েবলের নাম 'inputs' করুন
        'questionInput',
        'choice1',
        'choice2',
        'choice3',
        'choice4',
        'examTitle',
        'marksPerQuestion',
        'totalTime',
        'startTime',
        'endTime'
    ];

    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('focus', () => {
                activeInputId = id;
                console.log(`Active input: ${activeInputId}`);
            });
        }
    });
}

// সব input এ onfocus event লাগাই
document.querySelectorAll("input, textarea").forEach(el => {
  el.addEventListener("focus", () => {
    activeInputId = el.id;
  });

});

function insertMathSymbol(mathText, cursorOffset = mathText.length) {
    // প্রথমে activeInputId অনুযায়ী খুঁজুন
    let activeInput = document.getElementById(activeInputId);

    // যদি না পাওয়া যায়, তাহলে questionInput-এ ফিরে যান
    if (!activeInput) {
        console.warn(`Element with id "${activeInputId}" not found, falling back to questionInput`);
        activeInputId = 'questionInput';
        activeInput = document.getElementById(activeInputId);

        if (!activeInput) {
            alert('Error: Could not find any input field!');
            return;
        }
    }

    // কার্সর পজিশন পান
    const start = activeInput.selectionStart;
    const end = activeInput.selectionEnd;
    const text = activeInput.value;

    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    // নতুন টেক্সট ইনসার্ট করুন
    activeInput.value = before + mathText + after;

    // কার্সর পজিশন আপডেট করুন
    const newPos = start + Math.min(Math.max(cursorOffset, 0), mathText.length);
    activeInput.setSelectionRange(newPos, newPos);
    activeInput.focus();

    // Preview আপডেট করুন
    if (['questionInput', 'choice1', 'choice2', 'choice3', 'choice4'].includes(activeInputId)) {
        updateQuestionPreview();
    }
}

// Helper function to insert text at cursor position
function insertMathAtCursor(element, mathCode) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const text = element.value;

    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    element.value = before + mathCode + after;

    // Position cursor
    const emptyGroupPosition = mathCode.indexOf('{}');
    const newPos = start + (emptyGroupPosition >= 0
      ? emptyGroupPosition + 1
      : mathCode.startsWith('$') && mathCode.endsWith('$')
        ? mathCode.length - 1
        : mathCode.length);
    element.setSelectionRange(newPos, newPos);
    element.focus();
}

function toggleQuestionTypeChooser() {
  const chooser = document.getElementById('questionTypeChooser');
  const form = document.getElementById('questionCreatorForm');
  const willOpen = chooser.classList.contains('hidden');
  if (willOpen) form.classList.add('hidden');
  chooser.classList.toggle('hidden');
}

function beginQuestionCreation(type) {
  selectedQuestionType = type === 'mathematical' ? 'mathematical' : 'general';
  const form = document.getElementById('questionCreatorForm');
  form.classList.toggle('mathematical-question', selectedQuestionType === 'mathematical');
  document.getElementById('questionTypeChooser').classList.add('hidden');
  form.classList.remove('hidden');
  document.getElementById('questionTypeHeading').textContent =
    selectedQuestionType === 'mathematical' ? 'Mathematical question' : 'General question';
  document.getElementById('questionInput').placeholder = selectedQuestionType === 'mathematical'
    ? 'Write your question and add formulas like \\(x^2\\), or use Formula tools.'
    : 'Write your question in plain text. Add a formula with Formula tools if needed.';
  document.querySelector('#examStep1 .creator-help').textContent = selectedQuestionType === 'mathematical'
    ? 'Type LaTeX between \\( ... \\) or use Formula tools. The preview shows how it will look to students.'
    : 'You can include LaTeX between \\( ... \\) in a text question too.';
  const optionHelp = document.querySelectorAll('#examStep1 .creator-help')[1];
  document.querySelectorAll('#questionCreatorForm .form-label')[3].textContent = selectedQuestionType === 'mathematical'
    ? 'Answer choices'
    : 'Answer choices';
  optionHelp.textContent = selectedQuestionType === 'mathematical'
    ? 'Add formulas as LaTeX between \\( ... \\), or insert them with Formula tools. Then mark the correct answer.'
    : 'Enter four answer options. LaTeX is supported here too; mark the correct answer letter.';
  ['choice1', 'choice2', 'choice3', 'choice4'].forEach((id, index) => {
    document.getElementById(id).placeholder = selectedQuestionType === 'mathematical'
      ? `Choice ${String.fromCharCode(65 + index)}`
      : `Choice ${String.fromCharCode(65 + index)}`;
  });
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function backToQuestionTypeChooser() {
  document.getElementById('questionCreatorForm').classList.add('hidden');
  document.getElementById('questionTypeChooser').classList.remove('hidden');
}

function closeQuestionBank() {
  document.getElementById('questionBankModal').classList.add('hidden');
  questionBankReturnFocus?.focus();
}

async function openQuestionBank() {
  if (quizQuestions.length === 0 && typeof loadExamQuestions === 'function') {
    await loadExamQuestions();
  }
  const modal = document.getElementById('questionBankModal');
  questionBankReturnFocus = document.activeElement;
  if (modal.parentElement !== document.body) document.body.appendChild(modal);
  renderQuestionBankFilters();
  filterQuestionBank();
  modal.classList.remove('hidden');
  modal.querySelector('.question-bank-close').focus();
}

function renderQuestionBankFilters() {
  const subjectSelect = document.getElementById('questionBankSubject');
  const classSelect = document.getElementById('questionBankClass');
  const currentSubject = subjectSelect.value;
  const currentClass = classSelect.value;
  const subjects = [...new Set(quizQuestions.map(question => question.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const classes = [...new Set(quizQuestions.map(question => question.class).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  subjectSelect.innerHTML = '<option value="">All subjects</option>';
  classSelect.innerHTML = '<option value="">All classes</option>';
  subjects.forEach(subject => subjectSelect.add(new Option(subject, subject)));
  classes.forEach(className => classSelect.add(new Option(className, className)));
  subjectSelect.value = subjects.includes(currentSubject) ? currentSubject : '';
  classSelect.value = classes.includes(currentClass) ? currentClass : '';
}

function filterQuestionBank() {
  const subject = document.getElementById('questionBankSubject').value;
  const className = document.getElementById('questionBankClass').value;
  const questions = quizQuestions.filter(question =>
    (!subject || question.subject === subject) && (!className || question.class === className)
  );
  const container = document.getElementById('questionBankResults');

  if (!questions.length) {
    container.innerHTML = `<div class="question-bank-empty"><span>▤</span><strong>No questions found</strong><p>Try another subject or class, or create a new question.</p></div>`;
    return;
  }

  container.innerHTML = questions.map(question => {
    const options = question.choices || question.options || [];
    const questionText = question.question || question.questionText || '';
    const isWritten = question.answerType === 'written';
    const isMathQuestion = question.questionType === 'mathematical' || question.hasMath || hasMathContent(questionText);
    const correctIndex = typeof question.correct === 'number'
      ? question.correct
      : String(question.correctAnswer || 'A').charCodeAt(0) - 65;
    const choices = isWritten ? '<li>This question is marked manually from the student\'s uploaded answer.</li>' : ['A', 'B', 'C', 'D'].map((letter, index) => `
      <li class="${index === correctIndex ? 'bank-correct-choice' : ''}">
        <span>${letter}</span><div>${autoWrapMath(options[index] || '')}</div>
      </li>`).join('');
    return `
      <details class="question-bank-item">
        <summary>
          <span class="bank-question-type ${isMathQuestion ? 'math' : ''}">${isMathQuestion ? 'Mathematical' : 'General'}</span>
          <span class="bank-question-type ${isWritten ? 'written' : 'mcq'}">${isWritten ? 'Written' : 'MCQ'}</span>
          <span class="bank-question-prompt">${autoWrapMath(questionText)}</span>
          <span class="bank-question-meta">${escapeHtml(question.subject || 'Unsorted')} · ${escapeHtml(question.class || 'Class not set')}</span>
        </summary>
        <ul class="bank-choice-list">${choices}</ul>
        <div class="bank-question-actions">
          <button type="button" class="bank-delete-button" onclick="deleteSavedQuestion('${escapeHtml(question._id || '')}')" ${question._id ? '' : 'disabled'} aria-label="Delete question">Delete question</button>
        </div>
      </details>`;
  }).join('');

  if (typeof renderMathInElement === 'function') {
    renderMathInElement(container, { delimiters: [
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ], throwOnError: false });
  }
}

async function deleteSavedQuestion(questionId) {
  const question = quizQuestions.find(item => String(item._id) === String(questionId));
  if (!question || !questionId) return;
  if (!confirm('Delete this question from your question bank? This cannot be undone.')) return;

  try {
    const response = await fetch(`/api/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: localStorage.getItem('userId') })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not delete the question.');

    const removedIndex = quizQuestions.indexOf(question);
    quizQuestions = quizQuestions.filter(item => String(item._id) !== String(questionId));
    if (typeof selectedQuestions !== 'undefined' && selectedQuestions instanceof Set) {
      selectedQuestions = new Set([...selectedQuestions]
        .filter(index => index !== removedIndex)
        .map(index => index > removedIndex ? index - 1 : index));
      if (typeof updateQuestionsCount === 'function') updateQuestionsCount();
    }
    if (typeof populateQuestionSelectionFilters === 'function') populateQuestionSelectionFilters();
    if (typeof renderQuestionsList === 'function') renderQuestionsList();
    updateTeacherStats();
    updateQuestionsList();
    renderQuestionBankFilters();
    filterQuestionBank();
  } catch (error) {
    alert(error.message || 'Could not delete the question. Please try again.');
  }
}



  function updateQuestionPreview() {
  const inputdata = document.querySelectorAll('#questionInput,#choice1,#choice2,#choice3,#choice4');
  const outputs = document.querySelectorAll('#questionPreview,#choice1Preview,#choice2Preview,#choice3Preview,#choice4Preview');

    inputdata.forEach((inp, index) => {
      const value = inp.value;
      const out = outputs[index];

      if (!value.trim()) {
        out.innerHTML = "Type something above...";
        return;
      }
      try {
        out.innerHTML = autoWrapMath(value);
        renderMathInElement(out, {
          delimiters: [
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ]
        });
      } catch {
        out.innerHTML = "❌ Invalid LaTeX";
      }

    });
}











    // Teacher functions
    function setCorrectAnswer(index) {
      correctAnswer = index;
      const markers = document.querySelectorAll('.correct-marker');
      markers.forEach((marker, i) => {
        if (i === index) {
          marker.classList.remove('inactive');
          marker.setAttribute('aria-pressed', 'true');
          marker.style.transform = 'translateY(-50%) scale(1.2)';
        } else {
          marker.classList.add('inactive');
          marker.setAttribute('aria-pressed', 'false');
          marker.style.transform = 'translateY(-50%) scale(1)';
        }
      });

      const choices = ['A', 'B', 'C', 'D'];
      document.getElementById('correctIndicator').textContent = `✅ Correct Answer: ${choices[index]}`;
}

//renderchoices function

function renderChoice(num) {
  const input = document.getElementById(`choice${num}`).value;
  const preview = document.getElementById(`choicePreview${num}`);

  if (input.trim()) {
    try {
      katex.render(input, preview, { throwOnError: false });
    } catch (err) {
      preview.innerHTML = "❌ Invalid LaTeX";
    }
  } else {
    preview.innerHTML = "";
  }
}
