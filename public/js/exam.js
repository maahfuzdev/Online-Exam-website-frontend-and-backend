// Global variables for exams
let students = [];
let exams = [];
let selectedStudents = new Set();
let selectedQuestions = new Set();

// Initialize exam creator
async function initExamCreator() {
    await loadStudents();
    await loadExamQuestions();
    await loadExistingExams();
}

// Load students from database/API
async function loadStudents() {
    try {
      // Use your existing students array or fetch from MongoDB
      const res = await fetch('http://localhost:3000/assignments/api/students');
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
        // Use your existing quizQuestions or fetch from MongoDB
        renderQuestionsList();
        updateQuestionsCount();
    } catch (error) {
        console.error("Error loading questions:", error);
        showMessage("Failed to load questions", "error");
    }
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
    
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    
    students.forEach((student) => {
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

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

    quizQuestions.forEach((question, index) => {

        const text = question.questionText || question.question || "";
        const isSelected = selectedQuestions.has(index);

        const questionPreview = text.length > 80 
            ? text.substring(0, 80) + '...' 
            : text;

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
                          background: ${question.hasMath ? '#fef3c7' : '#e0e7ff'}; 
                          color: ${question.hasMath ? '#92400e' : '#3730a3'}; font-weight: 500;">
                        ${question.hasMath ? 'Math' : 'Text'}
                    </span>
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
    students.forEach((_, index) => {
        selectedStudents.add(index);
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
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const totalTime = document.getElementById("totalTime").value;
    const marksPerQuestion = parseFloat(document.getElementById('marksPerQuestion').value);

    // Validation
    if (!examTitle) return showMessage("Please enter exam title", "error");
    if (!startTime || !endTime) return showMessage("Please select start and end time", "error");
    if (new Date(startTime) >= new Date(endTime)) return showMessage("End time must be after start time", "error");
    if (selectedStudents.size === 0) return showMessage("Please select at least one student", "error");
    if (selectedQuestions.size === 0) return showMessage("Please select at least one question", "error");

    // Get teacher ID (আপনার authentication system থেকে)
    const teacherID = localStorage.getItem('userId') || 'your-teacher-id-here';

    // Create exam object with correct format
    const exam = {
        teacherID: teacherID,
        studentIDs: Array.from(selectedStudents),
        // MongoDB ObjectId গুলো
        examTitle:examTitle,
        questionIds: Array.from(selectedQuestions).map(index => quizQuestions[index]._id), // Convert indices to ObjectIds
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        examTime: totalTime, // in minutesz
        markPerQuestion: marksPerQuestion,
        totalMarks: Number(selectedQuestions.size * marksPerQuestion).toFixed(2)
    };

    try {
        console.log("Sending exam data:", exam);
        
        const response = await fetch('http://localhost:3000/assignments/api/assigned-questions', {
            method: 'POST',
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
        showMessage(`Exam "${examTitle}" created successfully!`, "success");
        
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
        const response = await fetch(`http://localhost:3000/assignments/api/assigned-questions/teacher/${teacherID}`);
        
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
// Render exams list
function renderExamsList() {
    const container = document.getElementById('examsList');
    if (!container) return;
    
    if (exams.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <div style="width: 60px; height: 60px; border: 2px dashed #d1d5db; 
                            border-radius: 50%; margin: 0 auto 20px; display: flex; 
                            align-items: center; justify-content: center; font-size: 24px;">📝</div>
                No exams created yet. Create your first exam above.
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">';
    
    exams.forEach(exam => {
        const startDate = new Date(exam.startTime);
        const endDate = new Date(exam.endTime);
        const now = new Date();
        
        let status = 'scheduled';
        let statusColor = '#f59e0b';
        
        if (now < startDate) {
            status = 'Upcoming';
            statusColor = '#3b82f6';
        } else if (now >= startDate && now <= endDate) {
            status = 'Live';
            statusColor = '#10b981';
        } else {
            status = 'Completed';
            statusColor = '#6b7280';
        }
        
        html += `
            <div style="background: white; border-radius: 14px; padding: 20px; 
                        border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); 
                        transition: all 0.3s;" 
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.08)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.05)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <h4 style="font-size: 18px; font-weight: 700; color: #374151; margin: 0;">
                        ${exam.examTitle}
                    </h4>
                    <span style="font-size: 12px; padding: 4px 10px; border-radius: 20px; 
                          background: ${statusColor}15; color: ${statusColor}; font-weight: 600;">
                        ${status}
                    </span>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="color: #6b7280; font-size: 14px;">📅</span>
                        <span style="font-size: 14px; color: #4b5563;">
                            ${formatDate(startDate)} - ${formatDate(endDate)}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="color: #6b7280; font-size: 14px;">👥</span>
                        <span style="font-size: 14px; color: #4b5563;">
                            ${exam.studentIDs ? exam.studentIDs.length : 0} students
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #6b7280; font-size: 14px;">❓</span>
                        <span style="font-size: 14px; color: #4b5563;">
                            ${exam.questionIds ? exam.questionIds.length : 0} questions
                        </span>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <div>
                        <div style="font-size: 13px; color: #6b7280;">Total Marks</div>
                        <div style="font-size: 20px; font-weight: 800; color: #374151;">
                            ${exam.totalMarks}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="viewExamDetails('${exam._id}')" 
                                style="padding: 8px 16px; background: #3b82f6; color: white; 
                                       border: none; border-radius: 8px; font-size: 13px; 
                                       font-weight: 600; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='#2563eb'"
                                onmouseout="this.style.background='#3b82f6'">
                            View
                        </button>
                        <button onclick="deleteExam('${exam._id}')" 
                                style="padding: 8px 16px; background: #f3f4f6; color: #ef4444; 
                                       border: none; border-radius: 8px; font-size: 13px; 
                                       font-weight: 600; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='#fee2e2'"
                                onmouseout="this.style.background='#f3f4f6'">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// View button er jonno function (EITA ADD KORUN)
function viewExamDetails(examId) {
    window.location.href = `examresult.html?examId=${examId}`;
}
window.viewExamDetails = viewExamDetails;

// Reset exam form
function resetExamForm() {
    document.getElementById('examTitle').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('marksPerQuestion').value = '1';
    
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