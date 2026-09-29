// Export quiz as PDF with proper math rendering
async function exportQuizPDF() {
  if (quizQuestions.length === 0) {
    alert('⚠️ No questions to export!');
    return;
  }

  // Show loading message
  const originalButton = document.querySelector('button[onclick="exportQuizPDF()"]');
  if (originalButton) {
    originalButton.innerHTML = '⏳ Generating PDF...';
    originalButton.disabled = true;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Create temporary HTML content with rendered math
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '800px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '14px';
    tempContainer.style.lineHeight = '1.4';
    tempContainer.style.padding = '20px';
    tempContainer.style.backgroundColor = 'white';
    document.body.appendChild(tempContainer);

    // Add title
    const title = document.createElement('h1');
    title.textContent = 'Exam Question Paper';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    tempContainer.appendChild(title);

    // Add questions
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];

      const questionDiv = document.createElement('div');
      questionDiv.style.marginBottom = '15px';

      // Question text
      const questionP = document.createElement('p');
      questionP.style.fontWeight = 'bold';
      questionP.style.marginBottom = '8px';
      questionP.innerHTML = `${i + 1}. ${autoWrapMath(q.question)}`;
      questionDiv.appendChild(questionP);

      // Render math in question
      renderMathInElement(questionP, {
        delimiters: [
          {left: "\\(", right: "\\)", display: false},
          {left: "\\[", right: "\\]", display: true},
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false}
        ],
        throwOnError: false
      });

      // Choices
      const choices = ["A", "B", "C", "D"];
      for (let j = 0; j < q.choices.length; j++) {
        const choiceP = document.createElement('p');
        choiceP.style.marginLeft = '20px';
        choiceP.style.marginBottom = '4px';
        choiceP.innerHTML = `${choices[j]}. ${autoWrapMath(q.choices[j])}`;
        questionDiv.appendChild(choiceP);

        // Render math in choice
        renderMathInElement(choiceP, {
          delimiters: [
            {left: "\\(", right: "\\)", display: false},
            {left: "\\[", right: "\\]", display: true},
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false}
          ],
          throwOnError: false
        });
      }

      tempContainer.appendChild(questionDiv);
    }

    // Wait for math rendering to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture as image
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: tempContainer.offsetHeight
    });

    // Clean up
    document.body.removeChild(tempContainer);

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download
    doc.save("exam_questions.pdf");

  } catch (error) {
    console.error('PDF export error:', error);
    alert('❌ Error generating PDF. Please try again.');
  } finally {
    // Reset button
    if (originalButton) {
      originalButton.innerHTML = '📥 Download Exam PDF';
      originalButton.disabled = false;
    }
  }
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

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function autoWrapMath(text) {
  const source = String(text ?? '');
  const argument = String.raw`\{(?:[^{}]|\{[^{}]*\})*\}`;
  const commandPattern = new RegExp(String.raw`\\[a-zA-Z]+(?:\[[^\]]*\])?(?:${argument}){0,2}`, 'g');
  let output = '';
  let lastIndex = 0;
  let match;

  while ((match = commandPattern.exec(source)) !== null) {
    output += escapeHtml(source.slice(lastIndex, match.index));
    const prefix = source.slice(0, match.index);
    const insideDollarMath = (prefix.match(/(?<!\\)\$/g) || []).length % 2 === 1;
    const insideParenMath = prefix.lastIndexOf('\\(') > prefix.lastIndexOf('\\)');
    const insideBracketMath = prefix.lastIndexOf('\\[') > prefix.lastIndexOf('\\]');

    if (insideDollarMath || insideParenMath || insideBracketMath) {
      output += escapeHtml(match[0]);
    } else {
      const previousCharacter = source.slice(0, match.index).slice(-1);
      const nextCharacter = source.slice(match.index + match[0].length, match.index + match[0].length + 1);
      if (/[A-Za-z\u0980-\u09FF]/.test(previousCharacter) && !/\s$/.test(output)) output += ' ';
      output += katex.renderToString(match[0], { throwOnError: false, strict: false });
      if (/[A-Za-z\u0980-\u09FF]/.test(nextCharacter)) output += ' ';
    }
    lastIndex = commandPattern.lastIndex;
  }

  return output + escapeHtml(source.slice(lastIndex));
}


    // Improved loadSingleQuestion function
    function loadSingleQuestion(question) {
      const questionElement = document.getElementById('currentQuestion');
      const choicesContainer = document.getElementById('choicesContainer');

      // Set question text

      questionElement.innerHTML = autoWrapMath(question.question);
      questionElement.style.whiteSpace = 'pre-wrap';

         renderMathInElement(questionElement, {
    delimiters: [
        {left: "\\(", right: "\\)", display: false},
             { left: "\\[", right: "\\]", display: true },
             { left: "$$", right: "$$", display: true },
             { left: "$", right: "$", display: false }



    ]
});




      // Clear and recreate choice buttons
      choicesContainer.innerHTML = '';
      question.choices.forEach((choice, index) => {
        const choiceButton = document.createElement('button');
        choiceButton.className = 'choice-option';
        choiceButton.innerHTML = `${String.fromCharCode(65 + index)}. ${autoWrapMath(choice)}`;
        choiceButton.style.whiteSpace = 'pre-wrap';
        choiceButton.onclick = () => selectAnswer(index);
        choicesContainer.appendChild(choiceButton);
        renderMathInElement(choiceButton, {
          delimiters: [
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ]
        });
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
  window.location.href = "/html/authentication.html";
  console.log("Redirecting to student login/registration page...");
}

function TeacherDash(){
  window.location.href = "/html/teacherdash.html";
}
