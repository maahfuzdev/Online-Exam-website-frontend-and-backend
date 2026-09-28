// Global variables for exams
let students = [];
let exams = [];
// let quizQuestions = [];
let selectedStudents = new Set();
let selectedQuestions = new Set();
let editingExamId = null;
let extendingLiveExam = false;
let bulkQuestions = [];
let bulkParseErrors = [];

function openBulkQuestionCreator() {
    document.getElementById('questionTypeChooser')?.classList.add('hidden');
    document.getElementById('questionCreatorForm')?.classList.add('hidden');
    const form = document.getElementById('bulkQuestionCreator');
    form?.classList.remove('hidden');
    const subject = document.getElementById('questionSubject')?.value.trim();
    const className = document.getElementById('questionClass')?.value.trim();
    if (subject && !document.getElementById('bulkQuestionSubject').value) document.getElementById('bulkQuestionSubject').value = subject;
    if (className && !document.getElementById('bulkQuestionClass').value) document.getElementById('bulkQuestionClass').value = className;
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeBulkQuestionCreator() {
    document.getElementById('bulkQuestionCreator')?.classList.add('hidden');
    document.getElementById('questionTypeChooser')?.classList.remove('hidden');
}

function parseBulkQuestionText(source) {
    const text = String(source || '').replace(/\r\n?/g, '\n').replace(/\\[ \t]*\n/g, '\n').replace(/[\u00a0\u2000-\u200b]/g, ' ');
    const answerPattern = /[*_\`#>•-]*[ \t]*(?:(?:সঠিক|correct)\s*)?(?:উত্তর|answer)\s*[:：=\-–]\s*([a-d])\s*[).]?[^\n]*(?:\n|$)/gim;
    const answerLines = [...text.matchAll(answerPattern)];
    if (!answerLines.length) return { questions: [], errors: ['No answer lines found. Add an answer line such as “উত্তর: b) Correct choice” after each question.'] };

    const questions = [];
    const errors = [];
    let blockStart = 0;
    answerLines.forEach((answerLine, index) => {
        const block = text.slice(blockStart, answerLine.index).replace(/\*\*/g, '').trim();
        blockStart = answerLine.index + answerLine[0].length;
        if (!block) {
            errors.push(`Question ${index + 1}: question text or choices are missing.`);
            return;
        }
        const optionPattern = /(^|[\s\u2000-\u200b—–])([a-d])\s*[).]\s*/gi;
        const markers = [...block.matchAll(optionPattern)].map(match => ({
            label: match[2].toUpperCase(),
            start: match.index + match[1].length,
            contentStart: match.index + match[0].length
        }));
        const labels = markers.map(marker => marker.label).join('');
        if (labels !== 'ABCD') {
            errors.push(`Question ${index + 1}: expected four choices labelled a), b), c), d) in that order; found ${labels || 'none'}.`);
            return;
        }
        const questionText = block.slice(0, markers[0].start).trim().replace(/^\d+\s*[.)]\s*/, '');
        const options = markers.map((marker, choiceIndex) => block.slice(marker.contentStart, markers[choiceIndex + 1]?.start ?? block.length).trim());
        if (!questionText || options.some(option => !option)) {
            errors.push(`Question ${index + 1}: question text and all four choices must have content.`);
            return;
        }
        questions.push({ questionText, options, correctAnswer: answerLine[1].toUpperCase() });
    });
    if (questions.length > 100) errors.push(`This batch has ${questions.length} valid questions. The maximum is 100 at a time.`);
    return { questions, errors };
}

function parseBulkQuestions() {
    const input = document.getElementById('bulkQuestionInput').value;
    const parsed = parseBulkQuestionText(input);
    bulkQuestions = parsed.questions;
    bulkParseErrors = parsed.errors;
    const preview = document.getElementById('bulkQuestionPreview');
    const saveRow = document.getElementById('bulkQuestionSaveRow');
    const status = document.getElementById('bulkQuestionStatus');
    preview.classList.remove('hidden');
    saveRow.classList.toggle('hidden', !bulkQuestions.length || parsed.errors.length > 0);
    status.classList.toggle('has-errors', parsed.errors.length > 0);
    status.textContent = parsed.errors.length
        ? `${parsed.errors.length} item${parsed.errors.length === 1 ? '' : 's'} need attention. Fix the format and parse again.`
        : `${bulkQuestions.length} question${bulkQuestions.length === 1 ? '' : 's'} found. Review and edit them before saving.`;
    document.getElementById('bulkQuestionSaveCount').textContent = `${bulkQuestions.length} questions ready to save`;
    renderBulkQuestionPreview(parsed.errors);
}

function renderBulkQuestionPreview(errors = []) {
    const preview = document.getElementById('bulkQuestionPreview');
    if (!preview) return;
    const errorMarkup = errors.length ? `<div class="bulk-parse-errors"><strong><i class="fas fa-circle-exclamation"></i> Check the pasted format</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>` : '';
    const questionMarkup = bulkQuestions.map((question, index) => `
      <article class="bulk-preview-card" data-bulk-index="${index}">
        <header><strong>Question ${index + 1}</strong><button type="button" class="bulk-remove-question" onclick="removeBulkQuestion(${index})" aria-label="Remove question ${index + 1}"><i class="fas fa-trash-can"></i></button></header>
        <label>Question text<textarea class="form-input" data-bulk-field="question" rows="2">${escapeHtml(question.questionText)}</textarea></label>
        <div class="bulk-preview-options">${question.options.map((option, optionIndex) => `<label><span>${String.fromCharCode(65 + optionIndex)}</span><input class="form-input" data-bulk-field="option" data-option-index="${optionIndex}" value="${escapeHtml(option)}"></label>`).join('')}</div>
        <label class="bulk-correct-answer">Correct answer<select class="form-input" data-bulk-field="answer">${['A', 'B', 'C', 'D'].map(letter => `<option value="${letter}" ${letter === question.correctAnswer ? 'selected' : ''}>${letter}${letter === question.correctAnswer ? ' — Correct' : ''}</option>`).join('')}</select></label>
      </article>`).join('');
    preview.innerHTML = `${errorMarkup}${questionMarkup}`;
}

function removeBulkQuestion(index) {
    bulkQuestions.splice(index, 1);
    document.getElementById('bulkQuestionSaveCount').textContent = `${bulkQuestions.length} questions ready to save`;
    document.getElementById('bulkQuestionSaveRow').classList.toggle('hidden', !bulkQuestions.length || bulkParseErrors.length > 0);
    document.getElementById('bulkQuestionStatus').textContent = bulkParseErrors.length
        ? `${bulkParseErrors.length} item${bulkParseErrors.length === 1 ? '' : 's'} still need attention. Fix the pasted format and parse again.`
        : `${bulkQuestions.length} question${bulkQuestions.length === 1 ? '' : 's'} ready. Review and edit them before saving.`;
    renderBulkQuestionPreview(bulkParseErrors);
}

function collectBulkQuestionEdits() {
    document.querySelectorAll('.bulk-preview-card').forEach(card => {
        const index = Number(card.dataset.bulkIndex);
        if (!bulkQuestions[index]) return;
        bulkQuestions[index].questionText = card.querySelector('[data-bulk-field="question"]').value.trim();
        bulkQuestions[index].options = [...card.querySelectorAll('[data-bulk-field="option"]')].map(input => input.value.trim());
        bulkQuestions[index].correctAnswer = card.querySelector('[data-bulk-field="answer"]').value;
    });
}

async function saveBulkQuestions() {
    const subject = document.getElementById('bulkQuestionSubject').value.trim();
    const className = document.getElementById('bulkQuestionClass').value.trim();
    const status = document.getElementById('bulkQuestionStatus');
    if (!subject || !className) { status.textContent = 'Enter the subject and class before saving.'; status.classList.add('has-errors'); return; }
    if (bulkParseErrors.length) { status.textContent = 'Fix the format errors and parse the questions again before saving.'; status.classList.add('has-errors'); return; }
    collectBulkQuestionEdits();
    if (!bulkQuestions.length || bulkQuestions.some(question => !question.questionText || question.options.length !== 4 || question.options.some(option => !option))) {
        status.textContent = 'Every question needs text and four non-empty choices.'; status.classList.add('has-errors'); return;
    }
    const teacherId = localStorage.getItem('userId');
    const button = document.getElementById('saveBulkQuestionsButton');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving questions…';
    try {
        const response = await fetch('/api/questions/bulk', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherId, subject, class: className, questions: bulkQuestions })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not save the questions.');
        status.textContent = `${payload.questions?.length || bulkQuestions.length} questions saved to your question bank.`;
        status.classList.remove('has-errors');
        showMessage(`${payload.questions?.length || bulkQuestions.length} questions saved successfully.`, 'success');
        await loadExamQuestions();
        document.getElementById('bulkQuestionCreator').classList.add('hidden');
        document.getElementById('questionTypeChooser').classList.remove('hidden');
        document.getElementById('bulkQuestionInput').value = '';
        document.getElementById('bulkQuestionPreview').innerHTML = '';
        document.getElementById('bulkQuestionPreview').classList.add('hidden');
        document.getElementById('bulkQuestionSaveRow').classList.add('hidden');
        bulkQuestions = [];
        bulkParseErrors = [];
    } catch (error) {
        status.textContent = error.message || 'Could not save the questions.';
        status.classList.add('has-errors');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Save all questions';
    }
}

// Initialize exam creator
async function initExamCreator() {
    await loadStudents();
    await loadExamQuestions();
    await loadExistingExams();
    const resultVisibilitySelect = document.getElementById('resultVisibility');
    if (resultVisibilitySelect) resultVisibilitySelect.onchange = updateResultVisibilityHelp;
    toggleNegativeMarking();
    updateResultVisibilityHelp();
}

function toggleNegativeMarking() {
    const enabled = document.getElementById('negativeMarkingEnabled')?.checked;
    const value = document.getElementById('negativeMarkPerWrong');
    if (!value) return;
    value.disabled = !enabled;
    if (enabled && (!Number(value.value) || Number(value.value) <= 0)) value.value = '0.25';
}

function updateResultVisibilityHelp() {
    const help = document.getElementById('resultVisibilityHelp');
    const policy = document.getElementById('resultVisibility')?.value;
    if (!help) return;
    help.textContent = policy === 'after_exam_end'
        ? 'Students can see their score and answer review after the scheduled exam end time.'
        : policy === 'teacher_release'
            ? 'Scores stay private until you choose Release results from the exam list.'
            : 'Students can see their score and answer review as soon as they submit.';
}

function showExamStep(step) {
    const targetStep = Number(step);
    if (![1, 2, 3].includes(targetStep)) return;
    document.querySelectorAll('.exam-step-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== `examStep${targetStep}`);
    });
    document.querySelectorAll('[data-exam-step]').forEach(button => {
        button.classList.toggle('active', Number(button.dataset.examStep) === targetStep);
        if (Number(button.dataset.examStep) === targetStep) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
    });
    if (targetStep === 3) loadExistingExams();
}

// Load students from database/API
async function loadStudents() {
    try {
      // Use your existing students array or fetch from MongoDB
      const res = await fetch('/assignments/api/students');
    if(!res.ok) throw new Error("Students API not responding");
    const data = await res.json();
      console.log("Fetched students:", data);
      students = data;
        renderStudentsList();
        updateStudentsCount();
    } catch (error) {
        console.error("Error loading students:", error);
        showMessage("Failed to load students", "error");
    }
}

// Load questions for exam creation
async function loadExamQuestions() {
    try {
        // Get teacher ID from localStorage
        const teacherId = localStorage.getItem('userId');
        if (!teacherId) {
            console.error("No teacher ID found in localStorage");
            showMessage("Please log in as a teacher first", "error");
            return;
        }

        // Fetch questions from API
        const response = await fetch(`/api/questions/${teacherId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch questions: ${response.status}`);
        }

        const questions = await response.json();
        console.log("Fetched questions:", questions);
        quizQuestions = questions;

        populateQuestionSelectionFilters();
        renderQuestionsList();
        updateQuestionsCount();
    } catch (error) {
        console.error("Error loading questions:", error);
        showMessage("Failed to load questions", "error");
    }
}

function populateQuestionSelectionFilters() {
    const subjectSelect = document.getElementById('scheduleQuestionSubject');
    const classSelect = document.getElementById('scheduleQuestionClass');
    if (!subjectSelect || !classSelect) return;

    const subjects = [...new Set(quizQuestions.map(question => question.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const classes = [...new Set(quizQuestions.map(question => question.class).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    subjectSelect.innerHTML = '<option value="">All subjects</option>';
    classSelect.innerHTML = '<option value="">All classes</option>';
    subjects.forEach(subject => subjectSelect.add(new Option(subject, subject)));
    classes.forEach(className => classSelect.add(new Option(className, className)));
}

// Render students list
function renderStudentsList() {
    const container = document.getElementById('studentsContainer');
  if (!container) return;
  
  console.log("Rendering students:", students, selectedStudents);
    
    if (students.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <div style="width: 40px; height: 40px; border: 2px dashed #d1d5db; 
                            border-radius: 50%; margin: 0 auto 15px; display: flex; 
                            align-items: center; justify-content: center;">👥</div>
                No students available
            </div>
        `;
        return;
    }
    
    const search = document.getElementById('studentSearch')?.value.trim().toLocaleLowerCase() || '';
    const visibleStudents = students.filter(student => `${student.name || ''} ${student.email || ''}`.toLocaleLowerCase().includes(search));
    if (!visibleStudents.length) {
        container.innerHTML = '<div class="assignment-loading">No students match your search.</div>';
        return;
    }

    let html = '<div class="assignment-options">';
    
    visibleStudents.forEach((student) => {
        const isSelected = selectedStudents.has(student._id);
        html += `
            <div style="display: flex; align-items: center; padding: 12px; 
                        border-radius: 10px; background: ${isSelected ? '#dbeafe' : 'white'}; 
                        border: 1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}; 
                        cursor: pointer; transition: all 0.2s;"
                 onclick="toggleStudent('${student._id}')"
                 onmouseover="this.style.borderColor='#3b82f6'"
                 onmouseout="this.style.borderColor='${isSelected ? '#3b82f6' : '#e5e7eb'}'">
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;"
                       onclick="event.stopPropagation(); toggleStudent('${student._id}')">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #374151; margin-bottom: 4px;">${student.name}</div>
                    <div style="font-size: 13px; color: #6b7280;">${student.email}</div>
                </div>
                <div style="width: 32px; height: 32px; background: ${isSelected ? '#3b82f6' : '#9ca3af'}; 
                            color: white; border-radius: 50%; display: flex; align-items: center; 
                            justify-content: center; font-size: 14px; font-weight: 600;">
                    ${student.name.charAt(0)}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderQuestionsList() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    if (quizQuestions.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <div style="width: 40px; height: 40px; border: 2px dashed #d1d5db; 
                            border-radius: 50%; margin: 0 auto 15px; display: flex; 
                            align-items: center; justify-content: center;">❓</div>
                No questions available. Add questions first.
            </div>
        `;
        return;
    }

    const subjectFilter = document.getElementById('scheduleQuestionSubject')?.value || '';
    const classFilter = document.getElementById('scheduleQuestionClass')?.value || '';
    const search = document.getElementById('scheduleQuestionSearch')?.value.trim().toLocaleLowerCase() || '';
    const visibleQuestions = quizQuestions.map((question, index) => ({ question, index })).filter(({ question }) => {
        const text = `${question.questionText || question.question || ''} ${question.subject || ''} ${question.class || ''}`.toLocaleLowerCase();
        return (!subjectFilter || question.subject === subjectFilter) && (!classFilter || question.class === classFilter) && text.includes(search);
    });

    if (!visibleQuestions.length) {
        container.innerHTML = '<div style="padding:32px 14px;text-align:center;color:#77877f;font-size:12px;">No questions match these filters.</div>';
        return;
    }

    let html = '<div class="assignment-options">';

    visibleQuestions.forEach(({ question, index }) => {

        const text = question.questionText || question.question || "";
        const isMathQuestion = question.questionType === 'mathematical' || question.hasMath || hasMathContent(text);
        const isSelected = selectedQuestions.has(index);

        const questionPreview = text.length > 80
            ? escapeHtml(text.substring(0, 80) + '...')
            : escapeHtml(text);

        html += `
        <div style="display: flex; align-items: center; padding: 12px; 
                    border-radius: 10px; background: ${isSelected ? '#f0f9ff' : 'white'}; 
                    border: 1px solid ${isSelected ? '#0ea5e9' : '#e5e7eb'}; 
                    cursor: pointer; transition: all 0.2s;"
             onclick="toggleQuestion(${index})"
             onmouseover="this.style.borderColor='#0ea5e9'"
             onmouseout="this.style.borderColor='${isSelected ? '#0ea5e9' : '#e5e7eb'}'">

            <input type="checkbox" ${isSelected ? 'checked' : ''} 
                   style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;"
                   onclick="event.stopPropagation(); toggleQuestion(${index})">

            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-weight: 700; color: #374151; font-size: 14px;">Q${index + 1}</span>
                    <span style="font-size: 12px; padding: 2px 8px; border-radius: 4px; 
                          background: ${isMathQuestion ? '#e8f5ef' : '#eef2ff'};
                          color: ${isMathQuestion ? '#087865' : '#4338ca'}; font-weight: 500;">
                        ${isMathQuestion ? 'Mathematical' : 'General'}
                    </span>
                    <span style="margin-left:6px;color:#71817c;font-size:11px;">${escapeHtml(question.subject || 'Unsorted')} · ${escapeHtml(question.class || 'Class not set')}</span>
                </div>

                <div class="math" style="font-size: 14px; color: #4b5563; line-height: 1.4;">
                    ${questionPreview}
                </div>
            </div>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;

    // Apply KaTeX rendering
    container.querySelectorAll(".math").forEach(el => {
        el.innerHTML = autoWrapMath(el.textContent);

        renderMathInElement(el, {
            delimiters: [
                { left: "\\(", right: "\\)", display: false },
                { left: "\\[", right: "\\]", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\begin{", right: "\\end{", display: true }
            ]
        });
    });
}


// Toggle student selection
function toggleStudent(studentId) {
    if (selectedStudents.has(studentId)) {
        selectedStudents.delete(studentId);
    } else {
        selectedStudents.add(studentId);
    }
    renderStudentsList();
    updateStudentsCount();
}

// Toggle question selection
function toggleQuestion(questionIndex) {
    if (selectedQuestions.has(questionIndex)) {
        selectedQuestions.delete(questionIndex);
    } else {
        selectedQuestions.add(questionIndex);
    }
    renderQuestionsList();
    updateQuestionsCount();
}

// Select all students
function selectAllStudents() {
    students.forEach(student => {
        selectedStudents.add(student._id);
    });
    renderStudentsList();
    updateStudentsCount();
}

// Deselect all students
function deselectAllStudents() {
    selectedStudents.clear();
    renderStudentsList();
    updateStudentsCount();
}

// Select all questions
function selectAllQuestions() {
    quizQuestions.forEach((_, index) => {
        selectedQuestions.add(index);
    });
    renderQuestionsList();
    updateQuestionsCount();
}

// Deselect all questions
function deselectAllQuestions() {
    selectedQuestions.clear();
    renderQuestionsList();
    updateQuestionsCount();
}

// Update students count display
function updateStudentsCount() {
    const selectedCount = document.getElementById('selectedStudentsCount');
    const totalCount = document.getElementById('totalStudentsCount');
    const pickerCount = document.getElementById('studentPickerCount');
    if (pickerCount) pickerCount.textContent = `${selectedStudents.size} selected`;
    
    if (selectedCount) {
        selectedCount.textContent = `${selectedStudents.size} students selected`;
        selectedCount.style.color = selectedStudents.size > 0 ? '#059669' : '#6b7280';
        selectedCount.style.fontWeight = selectedStudents.size > 0 ? '600' : '400';
    }
    
    if (totalCount) {
        totalCount.textContent = `Total: ${students.length}`;
    }
}

// Update questions count display
function updateQuestionsCount() {
    const selectedCount = document.getElementById('selectedQuestionsCount');
    const totalCount = document.getElementById('totalQuestionsCount');
    const pickerCount = document.getElementById('questionPickerCount');
    if (pickerCount) pickerCount.textContent = `${selectedQuestions.size} selected`;
    
    if (selectedCount) {
        selectedCount.textContent = `${selectedQuestions.size} questions selected`;
        selectedCount.style.color = selectedQuestions.size > 0 ? '#059669' : '#6b7280';
        selectedCount.style.fontWeight = selectedQuestions.size > 0 ? '600' : '400';
    }
    
    if (totalCount) {
        totalCount.textContent = `Total: ${quizQuestions.length}`;
    }
}

// Create and assign exam
async function createAndAssignExam() {
    const examTitle = document.getElementById('examTitle').value.trim();
    const subject = document.getElementById('examSubject').value.trim();
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const totalTime = document.getElementById("totalTime").value;
    const marksPerQuestion = parseFloat(document.getElementById('marksPerQuestion').value);
    const negativeMarkingEnabled = document.getElementById('negativeMarkingEnabled').checked;
    const negativeMarkPerWrong = negativeMarkingEnabled ? Number(document.getElementById('negativeMarkPerWrong').value) : 0;
    const resultVisibility = document.getElementById('resultVisibility').value;

    // Validation
    if (!examTitle) return showMessage("Please enter exam title", "error");
    if (!subject) return showMessage("Please enter the exam subject", "error");
    if (!startTime || !endTime) return showMessage("Please select start and end time", "error");
    if (new Date(startTime) >= new Date(endTime)) return showMessage("End time must be after start time", "error");
    if (!Number(totalTime) || Number(totalTime) < 1) return showMessage("Exam duration must be at least 1 minute", "error");
    if (!marksPerQuestion || marksPerQuestion <= 0) return showMessage("Marks per question must be greater than zero", "error");
    if (negativeMarkingEnabled && (!negativeMarkPerWrong || negativeMarkPerWrong <= 0)) return showMessage("Set a deduction greater than zero", "error");
    if (selectedStudents.size === 0) return showMessage("Please select at least one student", "error");
    if (selectedQuestions.size === 0) return showMessage("Please select at least one question", "error");

    // Get teacher ID (আপনার authentication system থেকে)
    const teacherID = localStorage.getItem('userId');
    if (!teacherID) return showMessage("Please log in as a teacher first", "error");

    // Create exam object with correct format
    const exam = {
        teacherID: teacherID,
        studentIDs: Array.from(selectedStudents),
        // MongoDB ObjectId গুলো
        examTitle:examTitle,
        subject,
        questionIds: Array.from(selectedQuestions).map(index => quizQuestions[index]._id), // Convert indices to ObjectIds
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        examTime: Number(totalTime),
        markPerQuestion: marksPerQuestion,
        totalMarks: Number(selectedQuestions.size * marksPerQuestion).toFixed(2),
        negativeMarkingEnabled,
        negativeMarkPerWrong,
        resultVisibility
    };

    try {
        console.log("Sending exam data:", exam);
        
        const response = await fetch(editingExamId
            ? `/assignments/api/assigned-questions/${editingExamId}`
            : '/assignments/api/assigned-questions', {
            method: editingExamId ? 'PUT' : 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // যদি authentication থাকে
            },
            body: JSON.stringify(exam)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || "Failed to save exam to server");
        }

        // Success message
        showMessage(editingExamId ? (extendingLiveExam ? 'Exam closing time extended successfully.' : `Exam "${examTitle}" updated successfully!`) : `Exam "${examTitle}" created successfully!`, "success");
        
        // Reset form
        resetExamForm();
        
        // Load updated exams list
        await loadExistingExams();

    } catch (err) {
        console.error("Error saving exam:", err);
        showMessage(`Failed to save exam: ${err.message}`, "error");
    }
}
// Save exam to storage (in real app, save to MongoDB)
function saveExamToStorage(exam) {
    // Get existing exams
    const storedExams = JSON.parse(localStorage.getItem('exams') || '[]');
    
    // Add new exam
    storedExams.push(exam);
    
    // Save back to localStorage
    localStorage.setItem('exams', JSON.stringify(storedExams));
    
    // Update global exams array
    exams.push(exam);
}

// Load existing exams
 
  async function loadExistingExams() {
    try {
        // Get teacher ID
        const teacherID = localStorage.getItem('userId') || 'your-teacher-id-here';
        
        // Fetch from API
        const response = await fetch(`/assignments/api/assigned-questions/teacher/${teacherID}`);
        
        if (!response.ok) throw new Error("Failed to load exams from server");
        
        const data = await response.json();
        exams = data;
        
        // Also store in localStorage as cache
        localStorage.setItem('exams', JSON.stringify(data));
        
        renderExamsList();
    } catch (error) {
        console.error("Error loading exams:", error);
        
        // Fallback to localStorage
        const storedExams = JSON.parse(localStorage.getItem('exams') || '[]');
        exams = storedExams;
        renderExamsList();
        
        showMessage("Using cached exams data", "warning");
    }
}
// Render a compact exam management list with scheduling, scoring, and release state.
function renderExamsList() {
    const container = document.getElementById('examsList');
    if (!container) return;
    if (!exams.length) {
        container.innerHTML = '<div style="padding:32px 16px;text-align:center;color:#8792a5;font-size:13px;">No exams yet. Your exams will appear here after you create one.</div>';
        return;
    }

    const policyLabels = { immediate: 'Results: immediately', after_exam_end: 'Results: after exam', teacher_release: 'Results: teacher release' };
    const cards = exams.map(exam => {
        const startDate = new Date(exam.startTime);
        const endDate = new Date(exam.endTime);
        const now = new Date();
        const status = now < startDate ? 'Upcoming' : now <= endDate ? 'Live' : 'Completed';
        const statusClass = status === 'Live' ? 'exam-status-live' : status === 'Upcoming' ? 'exam-status-upcoming' : 'exam-status-completed';
        const liveLock = status === 'Live' ? 'disabled title="A live exam cannot be deleted."' : '';
        const negativeSummary = exam.negativeMarkingEnabled ? `−${Number(exam.negativeMarkPerWrong)} per wrong answer` : 'No negative marking';
        const releaseAction = exam.resultVisibility === 'teacher_release' && !exam.resultsReleased
            ? `<button class="exam-release-action" type="button" ${liveLock} onclick="releaseExamResults('${exam._id}')">Release results</button>`
            : exam.resultVisibility === 'teacher_release' ? '<span class="exam-policy-badge">Results released</span>' : '';
        const resultsLocked = (exam.resultVisibility === 'teacher_release' && !exam.resultsReleased) || (exam.resultVisibility === 'after_exam_end' && now < endDate);
        const resultButton = resultsLocked
            ? '<button type="button" disabled title="Results are hidden until the release condition is met.">Results locked</button>'
            : `<button type="button" onclick="viewExamDetails('${exam._id}')">Results</button>`;
        return `<article class="exam-management-card">
          <div class="exam-management-top"><div><span class="exam-management-subject">${escapeHtml(exam.subject || 'Subject not set')}</span><h4>${escapeHtml(exam.examTitle || 'Untitled exam')}</h4></div><span class="exam-status-pill ${statusClass}">${status}</span></div>
          <div class="exam-management-meta"><span><strong>Schedule</strong>${formatDate(startDate)} – ${formatDate(endDate)}</span><span><strong>Students</strong>${exam.studentIDs?.length || 0} assigned</span><span><strong>Questions</strong>${exam.questionIds?.length || 0} · ${Number(exam.totalMarks || 0)} marks</span></div>
          <div class="exam-management-policies"><span class="exam-policy-badge">${negativeSummary}</span><span class="exam-policy-badge">${policyLabels[exam.resultVisibility || 'immediate']}</span></div>
          <div class="exam-management-actions">${releaseAction}<button class="exam-edit-action" type="button" onclick="editExam('${exam._id}', ${status === 'Live'})">${status === 'Live' ? 'Extend closing time' : 'Edit / reschedule'}</button>${resultButton}<button class="exam-delete-action" type="button" ${liveLock} onclick="deleteExam('${exam._id}')">Delete</button></div>
        </article>`;
    }).join('');
    container.innerHTML = `<div class="exam-management-grid">${cards}</div>`;
}

function toDateTimeLocal(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

function editExam(examId, extendOnly = false) {
    const exam = exams.find(item => String(item._id) === String(examId));
    if (!exam) return showMessage('This exam is not available. Refresh the exam list and try again.', 'error');
    editingExamId = String(exam._id);
    extendingLiveExam = extendOnly;
    document.getElementById('examTitle').value = exam.examTitle || '';
    document.getElementById('examSubject').value = exam.subject || '';
    document.getElementById('startTime').value = toDateTimeLocal(exam.startTime);
    document.getElementById('endTime').value = toDateTimeLocal(exam.endTime);
    document.getElementById('totalTime').value = Number(exam.examTime || 60);
    document.getElementById('marksPerQuestion').value = Number(exam.markPerQuestion || 1);
    document.getElementById('negativeMarkingEnabled').checked = Boolean(exam.negativeMarkingEnabled);
    document.getElementById('negativeMarkPerWrong').value = Number(exam.negativeMarkPerWrong || 0.25);
    document.getElementById('resultVisibility').value = exam.resultVisibility || 'immediate';
    ['examTitle', 'examSubject', 'totalTime', 'marksPerQuestion', 'startTime', 'negativeMarkingEnabled', 'negativeMarkPerWrong', 'resultVisibility'].forEach(id => {
        document.getElementById(id).disabled = extendOnly;
    });
    document.querySelectorAll('.assignment-picker, .exam-policy-panel').forEach(element => {
        element.classList.toggle('exam-extension-locked', extendOnly);
    });
    toggleNegativeMarking();
    updateResultVisibilityHelp();

    selectedStudents = new Set((exam.studentIDs || []).map(student => String(student._id || student)));
    const assignedQuestions = new Set((exam.questionIds || []).map(question => String(question._id || question)));
    selectedQuestions = new Set(quizQuestions.reduce((indices, question, index) => {
        if (assignedQuestions.has(String(question._id))) indices.push(index);
        return indices;
    }, []));
    renderStudentsList();
    renderQuestionsList();
    updateStudentsCount();
    updateQuestionsCount();

    document.getElementById('saveExamButton').textContent = extendOnly ? 'Extend exam closing time' : 'Save exam changes';
    document.getElementById('cancelEditExamButton').classList.remove('hidden');
    showExamStep(3);
    document.getElementById('examTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelExamEdit() {
    resetExamForm();
}

async function deleteExam(examId) {
    const exam = exams.find(item => String(item._id) === String(examId));
    const name = exam?.examTitle || 'this exam';
    if (!confirm(`Delete "${name}" and permanently remove all of its saved student results? This cannot be undone.`)) return;
    try {
        const response = await fetch(`/assignments/api/assigned-questions/${encodeURIComponent(examId)}`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherID: localStorage.getItem('userId') })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not delete this exam.');
        exams = exams.filter(item => String(item._id) !== String(examId));
        localStorage.setItem('exams', JSON.stringify(exams));
        renderExamsList();
        showMessage('Exam and saved results deleted.', 'success');
    } catch (error) {
        showMessage(error.message || 'Could not delete this exam.', 'error');
    }
}

async function releaseExamResults(examId) {
    try {
        const response = await fetch(`/assignments/api/assigned-questions/${encodeURIComponent(examId)}/release-results`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherID: localStorage.getItem('userId') })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Could not release results.');
        showMessage('Results are now available to students.', 'success');
        await loadExistingExams();
    } catch (error) {
        showMessage(error.message || 'Could not release results.', 'error');
    }
}

// View button er jonno function (EITA ADD KORUN)
function viewExamDetails(examId) {
    window.location.href = `examresult.html?examId=${encodeURIComponent(examId)}`;
}
window.viewExamDetails = viewExamDetails;

// Reset exam form
function resetExamForm() {
    editingExamId = null;
    extendingLiveExam = false;
    document.getElementById('examTitle').value = '';
    document.getElementById('examSubject').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('marksPerQuestion').value = '1';
    document.getElementById('totalTime').value = '60';
    document.getElementById('negativeMarkingEnabled').checked = false;
    document.getElementById('negativeMarkPerWrong').value = '0.25';
    document.getElementById('resultVisibility').value = 'immediate';
    document.getElementById('saveExamButton').textContent = 'Create exam and assign';
    document.getElementById('cancelEditExamButton').classList.add('hidden');
    ['examTitle', 'examSubject', 'totalTime', 'marksPerQuestion', 'startTime', 'negativeMarkingEnabled', 'negativeMarkPerWrong', 'resultVisibility'].forEach(id => {
        document.getElementById(id).disabled = false;
    });
    document.querySelectorAll('.assignment-picker, .exam-policy-panel').forEach(element => element.classList.remove('exam-extension-locked'));
    toggleNegativeMarking();
    updateResultVisibilityHelp();
    
    selectedStudents.clear();
    selectedQuestions.clear();
    
    renderStudentsList();
    renderQuestionsList();
    updateStudentsCount();
    updateQuestionsCount();
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showMessage(message, type = 'info') {
    // Remove existing message
    const existingMsg = document.querySelector('.exam-message');
    if (existingMsg) existingMsg.remove();
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'exam-message';
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    `;
    
    if (type === 'success') {
        messageDiv.style.background = '#10b981';
        messageDiv.style.color = 'white';
    } else if (type === 'error') {
        messageDiv.style.background = '#ef4444';
        messageDiv.style.color = 'white';
    } else {
        messageDiv.style.background = '#3b82f6';
        messageDiv.style.color = 'white';
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);



//view exam detail

// Add this function to your script.js or in the script section


// Initialize when page loads
window.addEventListener('load', function() {
    // Initialize exam creator when in teacher dashboard
    if (currentMode === 'teacher') {
        setTimeout(initExamCreator, 100);
    }
});
