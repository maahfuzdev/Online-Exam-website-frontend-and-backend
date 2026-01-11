



//Global variables
    let currentMode = 'landing'; // landing, teacher, student, quiz
    let quizQuestions = [];


    // Quiz state
    let currentQuestionIndex = 0;
    let score = 0;
    let selectedAnswer = null;
    let correctAnswer = null;
    let timeLeft = 30;
    let timer = null;
    let answered = false;
    let isPreviewMode = false;
    let currentQuizType = '';

   

    // Initialize the application
function init() {
      
      updateTeacherStats();
      updateStudentStats();

      // Add event listeners for real-time preview
  document.getElementById('questionInput').addEventListener('input', updateQuestionPreview);

  loadQuestionsFromDB().catch(error => {
        console.log("MongoDB load failed, trying localStorage:", error);
        loadFromLocalStorage();
    });
  
}
    


    // Navigation functions
    function showLandingPage() {
      hideAllSections();
      document.getElementById('landingPage').classList.remove('hidden');
      currentMode = 'landing';
    }

    function showTeacherDashboard() {
      hideAllSections();
      document.getElementById('teacherDashboard').classList.remove('hidden');
      currentMode = 'teacher';
      updateTeacherStats();
    }

    function showStudentDashboard() {
      hideAllSections();
      document.getElementById('studentDashboard').classList.remove('hidden');
      currentMode = 'student';
      updateStudentStats();
    }

    function hideAllSections() {
      document.getElementById('landingPage').classList.add('hidden');
      document.getElementById('teacherDashboard').classList.add('hidden');
      document.getElementById('studentDashboard').classList.add('hidden');
      document.getElementById('quizContainer').classList.add('hidden');
    }

// Math functions
    


let activeInputId = "questionInput"; // default হলো questionInput

// সব input এ onfocus event লাগাই
document.querySelectorAll("input, textarea").forEach(el => {
  el.addEventListener("focus", () => {
    activeInputId = el.id;
  });
  
});

    function insertMathSymbol(mathCode) {
      const activeInput = document.getElementById(activeInputId);
      const start = activeInput.selectionStart;
      const end = activeInput.selectionEnd;
      const text = activeInput.value;

      const before = text.substring(0, start);
      const after = text.substring(end, text.length);

      activeInput.value = before + mathCode + after;

      // Position cursor
      const newPos = start + mathCode.length;
      activeInput.setSelectionRange(newPos, newPos);
      activeInput.focus();

      updateQuestionPreview();
}

// সব input-এ live preview চালু
document.querySelectorAll('#questionInput, #choice1, #choice2, #choice3, #choice4')
  .forEach(el => el.addEventListener("input", updateQuestionPreview));

// সব input-এ live preview চালু
document.querySelectorAll('#questionInput, #choice1, #choice2, #choice3, #choice4')
  .forEach(el => el.addEventListener("input", updateQuestionPreview));


  function updateQuestionPreview() {
  const inputs = document.querySelectorAll('#questionInput,#choice1,#choice2,#choice3,#choice4');
  const outputs = document.querySelectorAll('#questionPreview,#choice1Preview,#choice2Preview,#choice3Preview,#choice4Preview');

    inputs.forEach((inp, index) => {
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
          marker.style.transform = 'translateY(-50%) scale(1.2)';
        } else {
          marker.classList.add('inactive');
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


// Emergency fallback system
const EMERGENCY_STORAGE_KEY = 'quiz_questions_backup';

// Save to localStorage as backup
function saveToLocalStorage() {
    try {
        localStorage.setItem(EMERGENCY_STORAGE_KEY, JSON.stringify(quizQuestions));
        console.log("✅ Saved to localStorage backup");
    } catch (error) {
        console.error("❌ Error saving to localStorage:", error);
    }
}

// Load from localStorage
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(EMERGENCY_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                quizQuestions = parsed;
                console.log("✅ Loaded from localStorage backup:", quizQuestions.length);
                updateTeacherStats();
                updateQuestionsList();
            }
        }
    } catch (error) {
        console.error("❌ Error loading from localStorage:", error);
    }
}

// Updated addQuestion function
function addQuestion(event) {
    const questionText = document.getElementById('questionInput').value.trim();
    const choice1 = document.getElementById('choice1').value.trim();
    const choice2 = document.getElementById('choice2').value.trim();
    const choice3 = document.getElementById('choice3').value.trim();
    const choice4 = document.getElementById('choice4').value.trim();

    if (!questionText || !choice1 || !choice2 || !choice3 || !choice4) {
        alert('⚠️ Please fill in all fields!');
        return;
    }

    if (correctAnswer === null) {
        alert('⚠️ Please select the correct answer!');
        return;
    }

    const question = {
        question: questionText,
        choices: [choice1, choice2, choice3, choice4],
        correct: correctAnswer,
        hasMath: hasMathContent(questionText) || [choice1, choice2, choice3, choice4].some(choice => hasMathContent(choice))
    };

  // Try MongoDB first, fallback to localStorage
  
  const teacherId = localStorage.getItem('userId');
    fetch("http://localhost:3000/api/questions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
      body: JSON.stringify({
            teacherId: teacherId,
            questionText: questionText,
            options: [choice1, choice2, choice3, choice4],
            correctAnswer: String.fromCharCode(65 + correctAnswer)
        })
    })
    .then(res => res.json())
    .then(data => {
        // MongoDB success
        question._id = data.question._id;
        //quizQuestions.push(question);
        updateTeacherStats();
        updateQuestionsList();
        clearForm();
        saveToLocalStorage(); // Backup to localStorage
        
        // Success animation
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Saved to DB!';
        setTimeout(() => btn.innerHTML = originalText, 1500);
    })
    .catch(error => {
        // MongoDB failed, use localStorage
        console.log("MongoDB failed, using localStorage:", error);
        question._id = 'local_' + Date.now();
        quizQuestions.push(question);
        updateTeacherStats();
        updateQuestionsList();
        clearForm();
        saveToLocalStorage();
        
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Saved Locally!';
        setTimeout(() => btn.innerHTML = originalText, 1500);
    });
}



// loadQuestionsFromDB ফাংশন আপডেট করুন
async function loadQuestionsFromDB() {
    try {
        console.log("🔄 Loading questions from MongoDB...");
      let id = localStorage.getItem('userId'); 
      console.log("Fetching questions for user ID:", id);
      console.log('role:', localStorage.getItem('role'));
      const role = localStorage.getItem('role');
      
      // সম্পূর্ণ URL ব্যবহার করুন
      let response;
      if (role === 'student') {
         response = await fetch(`http://localhost:3000/assignments/api/assigned-questions/${id}`);
      } else {
         response = await fetch(`http://localhost:3000/api/questions/${id}`);
      }
      
        
        console.log("Fetch response status:", response.status);
        console.log("Fetch response ok:", response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response text:", errorText);
            throw new Error(`HTTP error! status: ${response.status}, text: ${errorText}`);
        }
        
        const questions = await response.json();
        console.log(`✅ Loaded ${questions.length} questions from DB`);
      console.log("Questions data:", questions);
      
      //count total questions in DB
        const count = questions.length;
        
        document.getElementById('dbQuestionCount').textContent = count;
        document.getElementById('dbQuestionCount').style.color = '#059669';
        document.getElementById('dbQuestionCount').style.fontWeight = 'bold';
        
        // Convert DB format to app format
        quizQuestions = questions.map(q => ({
            _id: q._id,
            question: q.questionText,
            choices: q.options,
            correct: q.correctAnswer.charCodeAt(0) - 65,
            hasMath: hasMathContent(q.questionText) || q.options.some(option => hasMathContent(option))
        }));
        
        updateTeacherStats();
      updateQuestionsList();
      updateStudentStats();
      saveToLocalStorage(); // Backup to localStorage
      
        
        console.log("Updated quizQuestions:", quizQuestions);
        
    } catch (error) {
        console.error('⚠️ Could not load questions from DB:', error);
        console.log('📝 Using local questions only');
    }
}


    function hasMathContent(text) {
      return text.includes('$') || text.includes('\\') || /[\u2200-\u22FF\u2190-\u21FF\u25A0-\u25FF]/.test(text);
    }

    function clearForm() {
      document.getElementById('questionInput').value = '';
      document.getElementById('choice1').value = '';
      document.getElementById('choice2').value = '';
      document.getElementById('choice3').value = '';
      document.getElementById('choice4').value = '';
      correctAnswer = null;
      document.getElementById('correctIndicator').textContent = 'No correct answer selected';
      document.getElementById('questionPreview').innerHTML = 'Type your question to see preview...';

      const markers = document.querySelectorAll('.correct-marker');
      markers.forEach(marker => {
        marker.classList.add('inactive');
        marker.style.transform = 'translateY(-50%) scale(1)';
      });
    }

    function previewQuestion() {
      const questionText = document.getElementById('questionInput').value.trim();
      const choice1 = document.getElementById('choice1').value.trim();
      const choice2 = document.getElementById('choice2').value.trim();
      const choice3 = document.getElementById('choice3').value.trim();
      const choice4 = document.getElementById('choice4').value.trim();

      if (!questionText || !choice1 || !choice2 || !choice3 || !choice4) {
        alert('⚠️ Please fill in all fields to preview!');
        return;
      }

      const tempQuestion = {
        question: questionText,
        choices: [choice1, choice2, choice3, choice4],
        correct: correctAnswer || 0
      };

      // Show preview
      hideAllSections();
      document.getElementById('quizContainer').classList.remove('hidden');
      document.getElementById('previewMode').classList.remove('hidden');
      document.getElementById('resultsSection').classList.add('hidden');
      document.getElementById('quizContent').classList.remove('hidden');

      isPreviewMode = true;
      loadSingleQuestion(tempQuestion);
    }

    function updateTeacherStats() {
      document.getElementById('totalQuestions').textContent = quizQuestions.length;
      const mathCount = quizQuestions.filter(q => q.hasMath).length;
      document.getElementById('mathQuestions').textContent = mathCount;

      const statusEl = document.getElementById('readyStatus');
      if (quizQuestions.length > 0) {
        statusEl.textContent = '✅ Ready';
        statusEl.style.color = '#10b981';
      } else {
        statusEl.textContent = 'Not Ready';
        statusEl.style.color = '#ef4444';
      }
    }

    function updateQuestionsList() {
      const listEl = document.getElementById('questionsList');

      if (quizQuestions.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #64748b; font-style: italic;">No questions added yet...</p>';
        return;
      }

      let html = '';
      quizQuestions.forEach((q, index) => {
        const choices = ['A', 'B', 'C', 'D'];
        const mathIndicator = q.hasMath ? '🧮 ' : '📝 ';
        const questionPreview = q.hasMath 
      ? `<span class="math">${q.question}</span>` 
      : q.question;
        html += `
             <div class= "question-item">
                        <div class="question-text-preview">
                            ${mathIndicator}Q${index + 1}: ${questionPreview.substring(0, 80)}${questionPreview.length > 80 ? '...' : ''}
                        </div>
                        <div class="question-meta">
                            Correct Answer: ${choices[q.correct]} | ${q.hasMath ? 'Contains Math' : 'Text Only'}
                            <button onclick="removeQuestion(${index})" style="float: right; background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">Remove</button>
                        </div>
                    </div>
      `;
      });

      listEl.innerHTML = html;

       listEl.querySelectorAll(".math").forEach(el => {
         //katex.render(el.textContent, el, { throwOnError: false });
         el.innerHTML =autoWrapMath(el.textContent);
         renderMathInElement(el, {
    delimiters: [
        {left: "\\(", right: "\\)", display: false},
             { left: "\\[", right: "\\]", display: true },
             { left: "$", right: "$", display: false },
             { left: "\\begin{", right: "\\end{", display: true }
    ]
  });
    });
    }

//remove question from db and array

  async function removeQuestion(index) {
    if (!confirm('Are you sure you want to remove this question?')) return;
    
    const question = quizQuestions[index];
    
    try {
        // Delete from MongoDB if it has an _id
        if (question._id) {
            const response = await fetch(`/api/questions/${question._id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete from database');
            }
            
            console.log(`🗑️ Deleted from MongoDB: ${question._id}`);
        }
        
        // Remove from local array
        quizQuestions.splice(index, 1);
        updateTeacherStats();
        updateQuestionsList();
        
        alert('✅ Question removed from database!');
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Failed to delete question from database. Removed locally only.');
        
        // Fallback: Remove locally
        quizQuestions.splice(index, 1);
        updateTeacherStats();
        updateQuestionsList();
    }
}


// Database status updater
function updateDBStatus() {
    const dbStatus = document.getElementById('dbStatus');
    const dbQuestionCount = document.getElementById('dbQuestionCount');
    
    if (dbStatus) {
        dbStatus.innerHTML = `
            <span class="mr-2">✅</span>
            <span>Connected to MongoDB</span>
        `;
        dbStatus.className = "flex items-center text-green-600";
    }
    
    if (dbQuestionCount) {
        dbQuestionCount.textContent = quizQuestions.length;
    }
}

// loadQuestionsFromDB ফাংশনের শেষে কল করুন
updateDBStatus();

    function publishQuiz() {
      if (quizQuestions.length === 0) {
        alert('⚠️ Please add at least one question first!');
        return;
      }

      alert(`🚀 Quiz published successfully!\n\n📊 Questions: ${quizQuestions.length} \n🧮 Math Questions: ${quizQuestions.filter(q => q.hasMath).length} \n\nStudents can now take the quiz from the Student Dashboard.`);
      updateStudentStats();
    }

    function previewQuiz() {
      if (quizQuestions.length === 0) {
        alert('⚠️ Please add at least one question first!');
        return;
      }

      startQuiz('teacher-quiz', true);
    }
// Export quiz as PDF
   async function exportQuizPDF() {
  if (quizQuestions.length === 0) {
    alert('⚠️ No questions to export!');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20; // vertical position

  doc.setFontSize(16);
  doc.text("Exam Question Paper", 20, y);
  y += 10;

  doc.setFontSize(12);

  quizQuestions.forEach((q, index) => {
    // Question title
    doc.text(`${index + 1}. ${q.question}`, 20, y);
    y += 8;

    // Choices
    const choices = ["A", "B", "C", "D"];
    q.choices.forEach((opt, i) => {
      doc.text(`   ${choices[i]}. ${opt}`, 25, y);
      y += 7;
    });

    y += 5; // extra gap after each question

    // Auto new page if needed
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  // Download
  doc.save("exam_questions.pdf");
}

    // Student functions
    function updateStudentStats() {
      document.getElementById('availableQuestions').textContent = quizQuestions.length;
    }

    function startStudentQuiz(quizType) {
      currentQuizType = quizType;
      startQuiz(quizType, false);
    }

    // Quiz functions
    function startQuiz(quizType, preview = false) {
      let questionsToUse = [];

      if (quizType === 'teacher-quiz') {

        if (quizQuestions.length === 0) {
          alert('⚠️ No questions available! Teacher needs to create questions first.');
          return;
        }
        questionsToUse = [...quizQuestions];
      } else if (quizType === 'sample-quiz') {
        questionsToUse = [...sampleQuestions];
      }

      // Initialize quiz state
      currentQuestionIndex = 0;
      score = 0;
      selectedAnswer = null;
      answered = false;
      isPreviewMode = preview;

      // Show quiz interface
      hideAllSections();
      document.getElementById('quizContainer').classList.remove('hidden');
      document.getElementById('resultsSection').classList.add('hidden');
      document.getElementById('quizContent').classList.remove('hidden');

      if (preview) {
        document.getElementById('previewMode').classList.remove('hidden');
      } else {
        document.getElementById('previewMode').classList.add('hidden');
      }

      // Set questions for this quiz session
      window.currentQuizQuestions = questionsToUse;

      loadQuestion();
      updateProgress();
      updateScore();
      if (!isPreviewMode) startTimer();
    }

    function loadQuestion() {
      if (currentQuestionIndex >= window.currentQuizQuestions.length) {
        showResults();
        return;
      }

      const question = window.currentQuizQuestions[currentQuestionIndex];
      loadSingleQuestion(question);
}
    
// auto wrap math rendering function

function autoWrapMath(text) {
    // return text.replace(/\\[a-zA-Z]+(\{[^}]+\})?/g, (match) => {
    //     return `\\(${match}\\)`;  // inline math wrapper
  // });
  
  return text.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, (match) => {
        return katex.renderToString(match, { throwOnError: false });
    });
}


    // Improved loadSingleQuestion function
    function loadSingleQuestion(question) {
      const questionElement = document.getElementById('currentQuestion');
      const choicesContainer = document.getElementById('choicesContainer');

      // Set question text
      
      questionElement.innerHTML = autoWrapMath(question.question);

         renderMathInElement(questionElement, {
    delimiters: [
        {left: "\\(", right: "\\)", display: false},
             { left: "\\[", right: "\\]", display: true },
             { left: "$", right: "$", display: false }
            

        
    ]
});

      
      

      // Clear and recreate choice buttons
      choicesContainer.innerHTML = '';
      question.choices.forEach((choice, index) => {
        const choiceButton = document.createElement('button');
        choiceButton.className = 'choice-option';
        choiceButton.innerHTML = `${String.fromCharCode(65 + index)}. ${katex.renderToString(choice)}`;
        choiceButton.onclick = () => selectAnswer(index);
        choicesContainer.appendChild(choiceButton);
      });

      selectedAnswer = null;
      answered = false;
      updateButtons();

      if (!isPreviewMode) {
        resetTimer();
      }

      selectedAnswer = null;
      answered = false;
      updateButtons();

      if (!isPreviewMode) {
        resetTimer();
      }

      
    }

    function selectAnswer(index) {
      if (answered) return;

      selectedAnswer = index;
      const choices = document.querySelectorAll('.choice-option');
      choices.forEach(choice => choice.classList.remove('selected'));
      choices[index].classList.add('selected');

      document.getElementById('nextBtn').disabled = false;
    }

    function nextQuestion() {
      if (isPreviewMode) {
        backToTeacher();
        return;
      }

      if (selectedAnswer === null && !answered) {
        alert('⚠️ Please select an answer!');
        return;
      }

      if (!answered) {
        checkAnswer();
      } else {
        currentQuestionIndex++;
        loadQuestion();
        updateProgress();
      }
    }

    function previousQuestion() {
      if (currentQuestionIndex > 0 && !isPreviewMode) {
        currentQuestionIndex--;
        loadQuestion();
        updateProgress();
        startTimer();
      }
    }

    function checkAnswer() {
      if (answered) return;

      answered = true;
      if (timer) clearInterval(timer);

      const question = window.currentQuizQuestions[currentQuestionIndex];
      const choices = document.querySelectorAll('.choice-option');

      if (selectedAnswer === question.correct) {
        score++;
        choices[selectedAnswer].classList.add('correct');
      } else {
        if (selectedAnswer !== null) {
          choices[selectedAnswer].classList.add('incorrect');
        }
        choices[question.correct].classList.add('correct');
      }

      updateScore();

      setTimeout(() => {
        if (window.MathJax) {
          MathJax.typesetPromise([questionElement, choicesContainer])
            .then(() => {
              console.log('Math rendered successfully');
            })
            .catch((err) => {
              console.log('Math rendering error:', err);
              // Fallback: try to re-render after a short delay
              setTimeout(() => {
                if (window.MathJax) {
                  MathJax.typesetPromise([questionElement, choicesContainer]);
                }
              }, 500);
            });
        }
      }, 100);
    }

    function updateButtons() {
      const nextBtn = document.getElementById('nextBtn');
      const prevBtn = document.getElementById('prevBtn');

      if (isPreviewMode) {
        nextBtn.textContent = '← Back to Teacher';
        prevBtn.style.display = 'none';
      } else {
        nextBtn.textContent = currentQuestionIndex === window.currentQuizQuestions.length - 1 ? 'Finish' : 'Next ➡️';
        nextBtn.disabled = true;
        prevBtn.disabled = currentQuestionIndex === 0;
        prevBtn.style.display = 'block';
      }
    }

    // Timer functions
    function startTimer() {
      timeLeft = 30;
      updateTimerDisplay();

      timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
          checkAnswer();
        }
      }, 1000);
    }

    function resetTimer() {
      if (timer) clearInterval(timer);
      timeLeft = 30;
      updateTimerDisplay();
    }

    function updateTimerDisplay() {
      const timerEl = document.getElementById('timerDisplay');
      timerEl.textContent = `Time: ${timeLeft} s`;

      if (timeLeft <= 10) {
        timerEl.style.background = 'var(--danger-gradient)';
        timerEl.style.animation = 'pulse 1s infinite';
      } else {
        timerEl.style.background = 'var(--primary-gradient)';
        timerEl.style.animation = 'none';
      }
    }

    function updateProgress() {
      if (!window.currentQuizQuestions) return;

      const progress = ((currentQuestionIndex + 1) / window.currentQuizQuestions.length) * 100;
      document.getElementById('progressFill').style.width = progress + '%';
      document.getElementById('progressText').textContent = `Question ${currentQuestionIndex + 1} of ${window.currentQuizQuestions.length} `;
    }

    function updateScore() {
      if (!window.currentQuizQuestions) return;
      document.getElementById('scoreDisplay').textContent = `Score: ${score}/${window.currentQuizQuestions.length}`;
    }

    // Results functions
    function showResults() {
      if (timer) clearInterval(timer);

      document.getElementById('quizContent').classList.add('hidden');
      document.getElementById('resultsSection').classList.remove('hidden');
      document.getElementById('previewMode').classList.add('hidden');

      const finalScoreEl = document.getElementById('finalScore');
      const resultMessageEl = document.getElementById('resultMessage');
      const detailedResultsEl = document.getElementById('detailedResults');

      finalScoreEl.textContent = `${score}/${window.currentQuizQuestions.length}`;

      const percentage = (score / window.currentQuizQuestions.length) * 100;
      let message = '';
      let emoji = '';

      if (percentage >= 90) {
        message = 'Outstanding! You\'re a true quiz master! 🏆';
        emoji = '🌟';
      } else if (percentage >= 80) {
        message = 'Excellent work! You really know your stuff! 👏';
        emoji = '🎉';
      } else if (percentage >= 70) {
        message = 'Good job! You\'re on the right track! 👍';
        emoji = '✨';
      } else if (percentage >= 60) {
        message = 'Not bad! Keep practicing to improve! 📚';
        emoji = '💪';
      } else {
        message = 'Keep studying and try again! You can do it! 🌱';
        emoji = '🔄';
      }

      resultMessageEl.textContent = message;

      // Create detailed results
      let detailedHTML = `
                <div style="background: rgba(255,255,255,0.9); border-radius: 15px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: var(--text-dark); margin-bottom: 15px; text-align: center;">📊 Detailed Results</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; text-align: center;">
                        <div>
                            <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${score}</div>
                            <div style="color: var(--text-light); font-weight: 600;">Correct</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem; font-weight: 800; color: #ef4444;">${window.currentQuizQuestions.length - score}</div>
                            <div style="color: var(--text-light); font-weight: 600;">Incorrect</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem; font-weight: 800; color: #667eea;">${percentage.toFixed(1)}%</div>
                            <div style="color: var(--text-light); font-weight: 600;">Accuracy</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">${emoji}</div>
                            <div style="color: var(--text-light); font-weight: 600;">Grade</div>
                        </div>
                    </div>
                </div>
            `;

      detailedResultsEl.innerHTML = detailedHTML;
    }

    function restartQuiz() {
      if (isPreviewMode) {
        backToTeacher();
        return;
      }

      startQuiz(currentQuizType, false);
    }

    function backToDashboard() {
      if (currentMode === 'teacher' || isPreviewMode) {
        backToTeacher();
      } else {
        showStudentDashboard();
      }
    }

    function backToTeacher() {
      isPreviewMode = false;
      showTeacherDashboard();
    }

    // Utility functions
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
}
    

//login and registration page redirect function
function goToStudentLogRegPage() {
  window.location.href = "/authentication.html";
  console.log("Redirecting to student login/registration page...");
}

function TeacherDash(){
  window.location.href = "/teacherdash.html";
}

    // Initialize app
window.addEventListener('load', function () {
  const showstudent = localStorage.getItem('showstudent');
  const showteacher= localStorage.getItem('showteacher');
    if (showstudent === 'true') {
      this.window.location.href = "/index.html"; // ✅ এই ফাংশন already hideAllSections() + remove('hidden') handle করে
        localStorage.removeItem('showstudent'); // reset
    } else if (showteacher === 'true') {
      showTeacherDashboard();
      
        localStorage.removeItem('showteacher'); // reset
    } else {
        showLandingPage(); // landing page দেখানোর জন্য
    }

    init(); // app initialize
});