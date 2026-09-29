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
    const subject = document.getElementById('questionSubject').value.trim();
    const questionClass = document.getElementById('questionClass').value.trim();
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

    if (!subject || !questionClass) {
        alert('Please add a subject and class so this question is easy to find later.');
        return;
    }

    const question = {
        question: questionText,
        choices: [choice1, choice2, choice3, choice4],
        correct: correctAnswer,
        subject,
        class: questionClass,
        questionType: selectedQuestionType,
        hasMath: selectedQuestionType === 'mathematical' && (hasMathContent(questionText) || [choice1, choice2, choice3, choice4].some(choice => hasMathContent(choice)))
    };

  // Try MongoDB first, fallback to localStorage

  const teacherId = localStorage.getItem('userId');
    fetch("/api/questions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
      body: JSON.stringify({
            teacherId: teacherId,
            questionText: questionText,
            options: [choice1, choice2, choice3, choice4],
            correctAnswer: String.fromCharCode(65 + correctAnswer),
            subject,
            class: questionClass,
            questionType: selectedQuestionType
        })
    })
    .then(res => res.json())
    .then(data => {
        // MongoDB success
        question._id = data.question._id;
        quizQuestions.push(question);
        if (typeof populateQuestionSelectionFilters === 'function') populateQuestionSelectionFilters();
        if (typeof renderQuestionsList === 'function') renderQuestionsList();
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
        if (typeof populateQuestionSelectionFilters === 'function') populateQuestionSelectionFilters();
        if (typeof renderQuestionsList === 'function') renderQuestionsList();
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
         response = await fetch(`/assignments/api/assigned-questions/${id}`);
      } else {
         response = await fetch(`/api/questions/${id}`);
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

        const dbQuestionCount = document.getElementById('dbQuestionCount');
        if (dbQuestionCount) {
            dbQuestionCount.textContent = count;
            dbQuestionCount.style.color = '#059669';
            dbQuestionCount.style.fontWeight = 'bold';
        }

        // Convert DB format to app format
        quizQuestions = questions.map(q => ({
            _id: q._id,
            question: q.questionText,
            choices: q.options,
            correct: q.correctAnswer.charCodeAt(0) - 65,
            subject: q.subject || '',
            class: q.class || '',
            questionType: q.questionType || (hasMathContent(q.questionText) || q.options.some(option => hasMathContent(option)) ? 'mathematical' : 'general'),
            hasMath: q.questionType === 'mathematical' || hasMathContent(q.questionText) || q.options.some(option => hasMathContent(option))
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
      document.querySelectorAll('.correct-marker').forEach(marker => {
        marker.classList.add('inactive');
        marker.setAttribute('aria-pressed', 'false');
        marker.style.transform = '';
      });
      updateQuestionPreview();

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
      const mathCount = quizQuestions.filter(q => q.questionType === 'mathematical' || q.hasMath).length;
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
        const questionText = q.question || q.questionText || '';
        const questionIsMath = q.questionType === 'mathematical' || q.hasMath || hasMathContent(questionText);
        const mathIndicator = questionIsMath ? '🧮 ' : '📝 ';
        const questionPreviewText = questionText.length > 80 ? `${questionText.substring(0, 80)}...` : questionText;
        const questionPreview = questionIsMath
          ? `<span class="math">${escapeHtml(questionPreviewText)}</span>`
          : escapeHtml(questionPreviewText);
        html += `
             <div class= "question-item">
                        <div class="question-text-preview">
                            ${mathIndicator}Q${index + 1}: ${questionPreview}
                        </div>
                        <div class="question-meta">
                            ${escapeHtml(q.subject || 'Unsorted')} · ${escapeHtml(q.class || 'Class not set')} | Correct answer: ${choices[typeof q.correct === 'number' ? q.correct : String(q.correctAnswer || 'A').charCodeAt(0) - 65]} | ${questionIsMath ? 'Mathematical' : 'General'}
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
             { left: "$$", right: "$$", display: true },
             { left: "$", right: "$", display: false }
    ]
  });
    });
    }

//remove question from db and array

  async function removeQuestion(index) {
    const question = quizQuestions[index];
    if (!question) return;
    if (String(question._id || '').startsWith('local_')) {
      if (!confirm('Remove this locally saved question?')) return;
      quizQuestions.splice(index, 1);
      if (typeof selectedQuestions !== 'undefined' && selectedQuestions instanceof Set) {
        selectedQuestions = new Set([...selectedQuestions]
          .filter(selectedIndex => selectedIndex !== index)
          .map(selectedIndex => selectedIndex > index ? selectedIndex - 1 : selectedIndex));
        if (typeof updateQuestionsCount === 'function') updateQuestionsCount();
      }
      updateTeacherStats();
      updateQuestionsList();
      saveToLocalStorage();
      return;
    }
    await deleteSavedQuestion(question._id);
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

      alert(`🚀 Quiz published successfully!\n\n📊 Questions: ${quizQuestions.length} \n🧮 Math Questions: ${quizQuestions.filter(q => q.questionType === 'mathematical' || q.hasMath).length} \n\nStudents can now take the quiz from the Student Dashboard.`);
      updateStudentStats();
    }

    function previewQuiz() {
      if (quizQuestions.length === 0) {
        alert('⚠️ Please add at least one question first!');
        return;
      }

      startQuiz('teacher-quiz', true);
    }
