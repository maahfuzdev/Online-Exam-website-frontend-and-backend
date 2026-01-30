

    // Global variables
    let pdfFile = null;
    let extractedText = "";
    let generatedQuestions = [];
    let selectedLanguage = "English";
    let selectedType = "mcq";
    let isProcessing = false;
    let usingFallbackMode = false;
    let extractedTopics = [];

    // Initialize event listeners when page loads
    document.addEventListener('DOMContentLoaded', function () {
      const uploadArea = document.getElementById('uploadArea');
      const pdfInput = document.getElementById('pdfInput');

      if (uploadArea && pdfInput) {
        uploadArea.addEventListener('click', function () {
          pdfInput.click();
        });

        // Add drag and drop functionality
        uploadArea.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.stopPropagation();
          this.style.borderColor = '#4285f4';
          this.style.background = '#f0f9ff';
        });

        uploadArea.addEventListener('dragleave', function (e) {
          e.preventDefault();
          e.stopPropagation();
          this.style.borderColor = '#cbd5e0';
          this.style.background = '#f8fafc';
        });

        uploadArea.addEventListener('drop', function (e) {
          e.preventDefault();
          e.stopPropagation();
          this.style.borderColor = '#cbd5e0';
          this.style.background = '#f8fafc';

          const files = e.dataTransfer.files;
          if (files.length > 0) {
            handlePDFUpload({ target: { files: files } });
          }
        });
      }
    });

    // Handle PDF upload
    function handlePDFUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        alert('Please upload only PDF files.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('PDF file size should be less than 10MB.');
        return;
      }

      pdfFile = file;

      // Show file info
      document.getElementById('pdfPreview').classList.remove('hidden');
      document.getElementById('pdfName').textContent = file.name;
      document.getElementById('pdfSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      document.getElementById('pdfPages').textContent = 'Pages: Processing...';

      // Enable next button
      document.getElementById('nextStep1Btn').disabled = false;

      // Extract text from PDF
      extractTextFromPDF(file);
    }

    // Improved PDF text extraction
    async function extractTextFromPDF(file) {
      try {
        document.getElementById('extractedText').textContent = "Reading PDF...";
        document.getElementById('extractedTextPreview').classList.remove('hidden');

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        document.getElementById('pdfPages').textContent = `Pages: ${pdf.numPages}`;

        let fullText = "";
        const pageCount = Math.min(pdf.numPages, 15); // Read more pages

        for (let i = 1; i <= pageCount; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
          } catch (pageError) {
            console.error(`Error processing page ${i}:`, pageError);
          }
        }

        extractedText = fullText;

        // Show preview
        const previewText = fullText.substring(0, 500) + (fullText.length > 500 ? '...' : '');
        document.getElementById('extractedText').textContent = previewText;

        // Extract topics and process text
        processPDFContent(fullText);

        alert('PDF successfully processed! Ready to generate questions.');

      } catch (error) {
        console.error('PDF extraction error:', error);
        alert('Error reading PDF. Please try another PDF file.');
        removePDF();
      }
    }

    // Intelligent PDF content processing
    function processPDFContent(text) {
      console.log("Processing PDF content for better question generation...");

      // Clean the text
      let cleanText = text.replace(/\s+/g, ' ').trim();

      // Extract sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

      // Find key topics using intelligent detection
      extractedTopics = extractIntelligentTopics(sentences);

      // Store processed content
      window.pdfSentences = sentences;
      window.pdfKeyTopics = extractedTopics;
      window.cleanPDFText = cleanText;

      // Show detected topics
      displayDetectedTopics();
    }

    // Intelligent topic extraction
    function extractIntelligentTopics(sentences) {
      const topics = new Set();

      // Common academic keywords for different subjects
      const subjectKeywords = {
        'science': ['experiment', 'hypothesis', 'theory', 'research', 'data', 'analysis', 'results'],
        'math': ['equation', 'formula', 'calculate', 'solve', 'proof', 'theorem', 'geometry'],
        'history': ['event', 'period', 'century', 'war', 'revolution', 'civilization', 'empire'],
        'literature': ['character', 'plot', 'theme', 'author', 'novel', 'poetry', 'drama'],
        'technology': ['system', 'software', 'hardware', 'network', 'algorithm', 'database', 'programming']
      };

      // Extract meaningful phrases (noun phrases, key terms)
      sentences.forEach(sentence => {
        const words = sentence.toLowerCase().split(/\s+/);

        // Look for definition patterns
        if (sentence.match(/is\s+(?:a|an|the)\s+|\s+means\s+|\s+refers to\s+|definition of/i)) {
          const match = sentence.match(/([A-Z][a-z]+(?:\s+[A-Za-z]+){0,3})\s+(?:is|means|refers)/i);
          if (match) topics.add(match[1].trim());
        }

        // Look for lists and enumerations
        if (sentence.match(/\d+\.\s+|\d+\)\s+|•\s+|-\s+|\s+:\s+/)) {
          const listItems = sentence.split(/[\d\.\)•\-:]/).slice(1);
          listItems.forEach(item => {
            const trimmed = item.trim().split(/\s+/).slice(0, 5).join(' ');
            if (trimmed.length > 10) topics.add(trimmed);
          });
        }

        // Look for important capitalized terms
        const capsTerms = sentence.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g) || [];
        capsTerms.forEach(term => {
          if (term.split(' ').length <= 3 && term.length > 5) {
            topics.add(term);
          }
        });
      });

      // Also extract from headings and titles (usually shorter lines)
      const lines = extractedText.split('\n');
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 20 && trimmedLine.length < 100 &&
          !trimmedLine.match(/[a-z]/) || trimmedLine.match(/^[A-Z]/)) {
          topics.add(trimmedLine);
        }
      });

      return Array.from(topics).slice(0, 15); // Return top 15 topics
    }

    function displayDetectedTopics() {
      const container = document.getElementById('detectedTopics');
      const topicsList = document.getElementById('topicsList');

      if (extractedTopics.length > 0) {
        container.classList.remove('hidden');
        topicsList.innerHTML = '';

        extractedTopics.forEach(topic => {
          const badge = document.createElement('span');
          badge.className = 'topic-badge';
          badge.textContent = topic.substring(0, 30) + (topic.length > 30 ? '...' : '');
          topicsList.appendChild(badge);
        });
      }
    }

    function removePDF() {
      pdfFile = null;
      extractedText = "";
      extractedTopics = [];
      document.getElementById('pdfPreview').classList.add('hidden');
      document.getElementById('pdfInput').value = '';
      document.getElementById('nextStep1Btn').disabled = true;
      document.getElementById('extractedTextPreview').classList.add('hidden');
      document.getElementById('detectedTopics').classList.add('hidden');
    }

    // Step navigation
    function goToStep(step) {
      document.getElementById('step1Section').classList.add('hidden');
      document.getElementById('step2Section').classList.add('hidden');
      document.getElementById('step3Section').classList.add('hidden');
      document.getElementById('step4Section').classList.add('hidden');

      document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active', 'completed');
      });

      document.getElementById(`step${step}Section`).classList.remove('hidden');

      for (let i = 1; i <= step; i++) {
        document.getElementById(`step${i}`).classList.add(i === step ? 'active' : 'completed');
      }

      if (step === 4 && generatedQuestions.length > 0) {
        displayGeneratedQuestions();
      }
    }

    // Configuration functions
    function adjustQuestionCount(change) {
      const input = document.getElementById('questionCount');
      let value = parseInt(input.value) + change;
      if (value < 5) value = 5;
      if (value > 20) value = 20;
      input.value = value;
    }

    function selectLanguage(lang) {
      selectedLanguage = lang;
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');
    }

    function selectType(type) {
      selectedType = type;
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');
    }

    // Main AI Processing Function
    async function startAIProcessing() {
      if (!pdfFile) {
        alert('Please upload a PDF file first.');
        return;
      }

      const questionCount = parseInt(document.getElementById('questionCount').value);
      const examTitle = document.getElementById('examTitle').value.trim() || 'Generated Exam';

      // Go to processing step
      goToStep(3);
      isProcessing = true;
      usingFallbackMode = false;

      // Reset UI
      document.getElementById('errorMessage').classList.add('hidden');
      document.getElementById('fallbackMode').classList.add('hidden');
      document.getElementById('aiResponsePreview').classList.add('hidden');
      document.getElementById('nextStep3Btn').disabled = true;

      updateProcessingUI('Analyzing PDF content...', 10);

      try {
        // First try Gemini AI
        try {
          updateProcessingUI('Connecting to AI...', 30);
          const aiResponse = await callGeminiAI(window.cleanPDFText, questionCount, selectedLanguage, selectedType);
          updateProcessingUI('Processing AI response...', 70);

          generatedQuestions = parseAIResponse(aiResponse, questionCount);

          if (generatedQuestions.length === 0) {
            throw new Error('AI response empty');
          }

          document.getElementById('aiResponsePreview').classList.remove('hidden');
          document.getElementById('aiResponseText').textContent = aiResponse.substring(0, 800) + (aiResponse.length > 800 ? '...' : '');

        } catch (aiError) {
          console.log('AI API failed, using intelligent generation:', aiError);

          // Use intelligent question generation
          usingFallbackMode = true;
          document.getElementById('fallbackMode').classList.remove('hidden');
          updateProcessingUI('Generating questions from PDF...', 50);

          generatedQuestions = generateIntelligentQuestions(questionCount, selectedLanguage, selectedType);

          if (generatedQuestions.length === 0) {
            throw new Error('Could not generate questions from PDF');
          }
        }

        updateProcessingUI('Questions generated successfully!', 100);
        document.getElementById('nextStep3Btn').disabled = false;

        setTimeout(() => {
          goToStep(4);
        }, 1000);

      } catch (error) {
        console.error('Processing Error:', error);
        document.getElementById('errorText').textContent = error.message || 'Failed to generate questions. Please try again.';
        document.getElementById('errorMessage').classList.remove('hidden');
        updateProcessingUI('Failed', 0);
      } finally {
        isProcessing = false;
      }
    }

    // Intelligent question generation from PDF
    function generateIntelligentQuestions(count, language, type) {
      console.log("Generating intelligent questions from PDF...");

      const questions = [];
      const sentences = window.pdfSentences || [];
      const topics = window.pdfKeyTopics || [];
      const cleanText = window.cleanPDFText || extractedText;

      // If no sentences extracted, create from text
      const textSentences = sentences.length > 0 ? sentences :
        cleanText.split(/[.!?]+/).filter(s => s.trim().length > 20);

      // Create questions based on content
      for (let i = 0; i < count && i < textSentences.length; i++) {
        const sentence = textSentences[i];
        const words = sentence.split(/\s+/);

        if (type === 'mcq') {
          // Create meaningful MCQ from sentence
          const question = createMCQFromSentence(sentence, i + 1);
          if (question) questions.push(question);
        } else {
          // Create short answer question
          const question = createShortAnswerFromSentence(sentence, i + 1);
          if (question) questions.push(question);
        }
      }

      // Fill remaining questions if needed
      if (questions.length < count) {
        const remaining = count - questions.length;
        for (let i = 0; i < remaining; i++) {
          if (type === 'mcq') {
            questions.push(createGenericMCQ(questions.length + 1, topics));
          } else {
            questions.push(createGenericShortAnswer(questions.length + 1, topics));
          }
        }
      }

      return questions.slice(0, count);
    }

    function createMCQFromSentence(sentence, index) {
      const cleanSentence = sentence.replace(/\s+/g, ' ').trim();
      const words = cleanSentence.split(' ');

      if (words.length < 5) return null;

      // Create a meaningful question based on sentence type
      let questionText = '';
      let correctAnswer = '';
      let options = [];

      // Check for definition pattern
      if (cleanSentence.match(/\bis\s+(?:a|an|the)\b/i)) {
        const parts = cleanSentence.split(/\sis\s+(?:a|an|the)?\s+/i);
        if (parts.length >= 2) {
          const term = parts[0].trim();
          const definition = parts[1].replace(/[.!?]+$/, '').trim();

          questionText = `What is ${term}?`;
          correctAnswer = definition.substring(0, 100);

          // Create plausible alternatives
          options = [
            correctAnswer,
            getSimilarTerm(term) + " is " + getRandomDescription(),
            "A different concept unrelated to " + term,
            "None of the above"
          ];
        }
      }

      // Check for comparison or list
      else if (cleanSentence.match(/\band\b|\bor\b|\bbut\b/i)) {
        const mainConcept = extractMainConcept(cleanSentence);
        questionText = `Which of the following is true about ${mainConcept}?`;
        correctAnswer = cleanSentence.substring(0, 80);

        options = [
          correctAnswer,
          getAlternativeStatement(mainConcept),
          getOppositeStatement(mainConcept),
          "All of the above are incorrect"
        ];
      }

      // Default question
      else {
        const mainConcept = extractMainConcept(cleanSentence) || "this concept";
        questionText = `Based on the content, what does the text say about ${mainConcept}?`;
        correctAnswer = cleanSentence.substring(0, 100);

        options = [
          correctAnswer,
          "The opposite of what is stated",
          "A similar but incorrect interpretation",
          "The text does not mention this"
        ];
      }

      // Shuffle options
      const shuffledOptions = shuffleArray([...options]);
      const correctIndex = shuffledOptions.indexOf(correctAnswer);

      return {
        id: index,
        text: questionText,
        options: shuffledOptions,
        correctAnswer: String.fromCharCode(65 + correctIndex),
        marks: getRandomMarks(),
        difficulty: getRandomDifficulty(),
        type: 'mcq'
      };
    }

    function createShortAnswerFromSentence(sentence, index) {
      const cleanSentence = sentence.replace(/\s+/g, ' ').trim();
      const words = cleanSentence.split(' ');

      if (words.length < 5) return null;

      let questionText = '';
      let correctAnswer = '';

      // Create different types of short answer questions
      const questionTypes = [
        {
          pattern: /explain|describe|discuss/i,
          template: (concept) => `Explain the concept of ${concept}.`
        },
        {
          pattern: /what is|define|meaning of/i,
          template: (concept) => `What is ${concept}?`
        },
        {
          pattern: /how does|how to|process of/i,
          template: (concept) => `How does ${concept} work?`
        },
        {
          pattern: /why|reason|cause/i,
          template: (concept) => `Why is ${concept} important?`
        }
      ];

      const mainConcept = extractMainConcept(cleanSentence) || "this topic";

      // Find matching question type
      let matchedType = questionTypes.find(type => cleanSentence.match(type.pattern));
      if (!matchedType) matchedType = questionTypes[0];

      questionText = matchedType.template(mainConcept);
      correctAnswer = cleanSentence.substring(0, 150);

      return {
        id: index,
        text: questionText,
        correctAnswer: correctAnswer,
        marks: getRandomMarks(),
        difficulty: getRandomDifficulty(),
        type: 'short'
      };
    }

    function createGenericMCQ(index, topics) {
      const topic = topics.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : "the main topic";

      const questionTemplates = [
        `What is the primary focus of ${topic}?`,
        `Which statement best describes ${topic}?`,
        `What is the key characteristic of ${topic}?`,
        `Which of the following is associated with ${topic}?`
      ];

      const questionText = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

      const options = [
        `The correct explanation based on the text`,
        `A common misconception about ${topic}`,
        `An unrelated concept that sounds similar`,
        `None of these accurately describe ${topic}`
      ];

      return {
        id: index,
        text: questionText,
        options: shuffleArray(options),
        correctAnswer: 'A',
        marks: getRandomMarks(),
        difficulty: getRandomDifficulty(),
        type: 'mcq'
      };
    }

    function createGenericShortAnswer(index, topics) {
      const topic = topics.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : "the subject matter";

      const questionTemplates = [
        `Summarize the main points about ${topic}.`,
        `What are the key aspects of ${topic}?`,
        `Explain the significance of ${topic} in the context of the text.`,
        `Describe how ${topic} is presented in the material.`
      ];

      const questionText = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

      return {
        id: index,
        text: questionText,
        correctAnswer: `This answer would discuss ${topic} based on the content of the PDF. Key points include relevant information extracted from the material.`,
        marks: getRandomMarks(),
        difficulty: getRandomDifficulty(),
        type: 'short'
      };
    }

    // Helper functions
    function extractMainConcept(sentence) {
      // Extract the main noun phrase
      const words = sentence.split(' ');
      if (words.length < 3) return null;

      // Look for capitalized words or important terms
      const importantWords = words.filter(word =>
        word.length > 3 &&
        (word[0] === word[0].toUpperCase() ||
          ['theory', 'method', 'system', 'process', 'model'].includes(word.toLowerCase()))
      );

      return importantWords.length > 0 ? importantWords[0] : words.slice(0, 3).join(' ');
    }

    function getSimilarTerm(term) {
      const similar = {
        'machine': 'computer',
        'learning': 'training',
        'algorithm': 'procedure',
        'data': 'information',
        'analysis': 'examination',
        'system': 'framework',
        'process': 'method',
        'theory': 'concept',
        'model': 'representation'
      };

      return similar[term.toLowerCase()] || term;
    }

    function getRandomDescription() {
      const descriptions = [
        "a systematic approach to problem solving",
        "an important concept in the field",
        "a key component of the system",
        "a fundamental principle discussed",
        "a method for achieving results"
      ];
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    function getAlternativeStatement(concept) {
      const alternatives = [
        `${concept} is different from what is described`,
        `${concept} has multiple interpretations`,
        `There are conflicting views about ${concept}`,
        `${concept} is sometimes misunderstood`
      ];
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    }

    function getOppositeStatement(concept) {
      const opposites = [
        `The opposite of what is stated about ${concept}`,
        `${concept} does not work as described`,
        `Research contradicts the statement about ${concept}`,
        `${concept} is actually the reverse of this`
      ];
      return opposites[Math.floor(Math.random() * opposites.length)];
    }

    function getRandomMarks() {
      return Math.floor(Math.random() * 5) + 1;
    }

    function getRandomDifficulty() {
      const difficulties = ['Easy', 'Medium', 'Hard'];
      return difficulties[Math.floor(Math.random() * difficulties.length)];
    }

    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    function updateProcessingUI(status, progress) {
      document.getElementById('processingStatus').textContent = status;
      document.getElementById('progressBar').style.width = progress + '%';

      const steps = document.getElementById('processingSteps');
      const stepItems = [
        'Reading text from PDF...',
        'Analyzing content...',
        'Creating questions...',
        'Formatting exam...'
      ];

      let html = '';
      stepItems.forEach((step, index) => {
        const stepProgress = (index + 1) * 25;
        const isCompleted = progress >= stepProgress;
        const isCurrent = progress >= (index * 25) && progress < stepProgress;

        html += `
          <div style="margin: 8px 0; color: ${isCompleted ? '#10b981' : '#4a5568'}">
            <i class="fas fa-${isCompleted ? 'check-circle' : isCurrent ? 'spinner fa-spin' : 'circle'}" 
               style="color: ${isCompleted ? '#10b981' : isCurrent ? '#4285f4' : '#e2e8f0'}"></i>
            ${step}
          </div>
        `;
      });

      steps.innerHTML = html;
    }

    // Gemini AI Function (same as before)
    async function callGeminiAI(text, count, language, type) {
      const apiKey = "AIzaSyDL5feA_nROuBVPoY4GAfYhIgAfGrn2tUY";

      const prompt = `Create ${count} ${type === 'mcq' ? 'MCQ' : 'short answer'} questions in ${language} based on this text: ${text.substring(0, 30000)}`;

      const endpoints = [
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
      ];

      for (const endpoint of endpoints) {
        try {
          const url = `${endpoint}?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
              return data.candidates[0].content.parts[0].text;
            }
          }
        } catch (error) {
          console.log(`Endpoint error:`, error.message);
        }
      }

      throw new Error('AI API connection failed');
    }

    // Parse AI Response (same as before)
    function parseAIResponse(response, expectedCount) {
      const questions = [];
      if (!response || response.trim().length < 50) {
        throw new Error('AI did not generate questions');
      }

      const lines = response.split('\n');
      let currentQuestion = null;
      let questionNumber = 1;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.match(/^Q\d+\./) || trimmedLine.match(/^\d+\./)) {
          if (currentQuestion) questions.push(currentQuestion);
          currentQuestion = {
            id: questionNumber++,
            text: trimmedLine.replace(/^Q?\d+\.\s*/, ''),
            options: [],
            correctAnswer: '',
            marks: 1,
            difficulty: 'Medium',
            type: selectedType
          };
        }
        else if (selectedType === 'mcq' && trimmedLine.match(/^[A-D]\)/)) {
          if (currentQuestion) {
            const optionText = trimmedLine.replace(/^[A-D]\)\s*/, '');
            const optionLetter = trimmedLine.charAt(0);
            currentQuestion.options.push(optionText.replace('(Correct)', '').trim());
            if (optionText.includes('(Correct)')) {
              currentQuestion.correctAnswer = optionLetter;
            }
          }
        }
        else if (selectedType === 'short' && trimmedLine.match(/^Answer:/i)) {
          if (currentQuestion) {
            currentQuestion.correctAnswer = trimmedLine.replace(/^Answer:\s*/i, '');
          }
        }
        else if (trimmedLine.includes('Marks:') || trimmedLine.includes('Difficulty:')) {
          if (currentQuestion) {
            const marksMatch = trimmedLine.match(/Marks:\s*(\d+)/i);
            if (marksMatch) currentQuestion.marks = parseInt(marksMatch[1]);
            const diffMatch = trimmedLine.match(/Difficulty:\s*(\w+)/i);
            if (diffMatch) currentQuestion.difficulty = diffMatch[1];
          }
        }
      }

      if (currentQuestion) questions.push(currentQuestion);
      return questions.slice(0, expectedCount);
    }

    function displayGeneratedQuestions() {
      const container = document.getElementById('questionsPreview');
      const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);

      document.getElementById('totalQuestionsCount').textContent = generatedQuestions.length;
      document.getElementById('totalMarksCount').textContent = totalMarks;
      document.getElementById('finalLanguage').textContent = selectedLanguage;
      document.getElementById('finalType').textContent = selectedType === 'mcq' ? 'MCQ' : 'Short Answer';

      let html = '';
      generatedQuestions.forEach((question, index) => {
        const optionLetters = ['A', 'B', 'C', 'D'];

        html += `
          <div class="question-item">
            <div style="margin-bottom: 12px;">
              <span class="question-counter">Q${index + 1}</span>
              <span class="marks-badge">${question.marks} Marks</span>
              <span style="background: #f59e0b; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem;">
                ${question.difficulty}
              </span>
            </div>
            
            <div style="font-weight: 600; margin-bottom: 12px; color: #1a202c;">
              ${question.text}
            </div>`;

        if (question.type === 'mcq') {
          html += `<div style="margin-top: 12px;">`;
          question.options.forEach((option, optIndex) => {
            const isCorrect = optionLetters[optIndex] === question.correctAnswer;
            html += `
              <div class="mcq-option ${isCorrect ? 'correct' : ''}">
                <span style="font-weight: 600; margin-right: 8px;">
                  ${optionLetters[optIndex]})
                </span>
                ${option}
                ${isCorrect ? '<span style="float: right; color: #10b981;"><i class="fas fa-check"></i> Correct</span>' : ''}
              </div>
            `;
          });
          html += `</div>`;
        } else {
          html += `
            <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin-top: 12px;">
              <strong>Answer:</strong> ${question.correctAnswer}
            </div>
          `;
        }

        html += `</div>`;
      });

      container.innerHTML = html;
      updateExamPreview();
    }

    function updateExamPreview() {
      const title = document.getElementById('examTitle').value || 'Generated Exam';
      const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);
      const today = new Date().toLocaleDateString('en-US');

      document.getElementById('previewExamTitle').textContent = title;
      document.getElementById('previewExamDetails').textContent =
        `Date: ${today} | Time: 3 Hours | Total Marks: ${totalMarks} | Language: ${selectedLanguage}`;

      const previewContainer = document.getElementById('previewQuestions');
      let html = '';

      generatedQuestions.forEach((question, index) => {
        html += `
          <div class="preview-question">
            <div style="margin-bottom: 8px; font-weight: bold;">
              ${index + 1}. ${question.text} [${question.marks}]
            </div>`;

        if (question.type === 'mcq') {
          html += `<div style="padding-left: 15px;">`;
          question.options.forEach((option, optIndex) => {
            html += `
              <div style="margin: 4px 0;">
                ${String.fromCharCode(65 + optIndex)}) ${option}
              </div>
            `;
          });
          html += `</div>`;
        } else {
          html += `
            <div style="padding-left: 15px; color: #666;">
              <em>Short Answer Question</em>
            </div>
          `;
        }

        html += `</div>`;
      });

      previewContainer.innerHTML = html;
    }

    // Export functions (same as before)
    function downloadPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const title = document.getElementById('examTitle').value || 'Generated Exam';
      const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);
      const today = new Date().toLocaleDateString('en-US');

      doc.setFontSize(18);
      doc.text(title, 105, 20, { align: 'center' });

      doc.setFontSize(11);
      doc.text(`Date: ${today} | Time: 3 Hours | Total Marks: ${totalMarks} | Language: ${selectedLanguage}`,
        105, 28, { align: 'center' });

      doc.setFontSize(10);
      const instructions = [
        "Instructions:",
        "1. Read all questions carefully.",
        "2. Write your name and roll number clearly.",
        "3. All questions are compulsory.",
        "4. Each question has specific marks.",
        selectedType === 'mcq' ?
          "5. For MCQ questions, select the correct option." :
          "5. For short answer questions, write your answer.",
        "6. Do not use unfair means."
      ];

      let yPos = 40;
      instructions.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 6;
      });

      yPos += 8;

      doc.setFontSize(11);
      generatedQuestions.forEach((question, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const questionText = `${index + 1}. ${question.text} [${question.marks}]`;
        const questionLines = doc.splitTextToSize(questionText, 170);
        doc.text(questionLines, 20, yPos);
        yPos += questionLines.length * 5;

        if (question.type === 'mcq') {
          question.options.forEach((option, optIndex) => {
            const optionText = `   ${String.fromCharCode(65 + optIndex)}) ${option}`;
            const optionLines = doc.splitTextToSize(optionText, 170);
            doc.text(optionLines, 25, yPos);
            yPos += optionLines.length * 4.5;
          });
        } else {
          doc.text(`   Answer: _______________________`, 25, yPos);
          yPos += 7;
        }

        yPos += 8;
      });

      doc.setFontSize(9);
      doc.text("This question paper was generated from PDF content", 105, 280, { align: 'center' });

      doc.save(`Exam_${Date.now()}.pdf`);
    }

    function downloadAnswerKey() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const title = document.getElementById('examTitle').value || 'Generated Exam';

      doc.setFontSize(18);
      doc.text(`${title} - Answer Key`, 105, 20, { align: 'center' });

      let yPos = 35;

      doc.setFontSize(11);
      generatedQuestions.forEach((question, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const answerText = `${index + 1}. ${question.text}`;
        const answerLines = doc.splitTextToSize(answerText, 170);
        doc.text(answerLines, 20, yPos);
        yPos += answerLines.length * 5;

        if (question.type === 'mcq') {
          const correctAnswer = `Correct Answer: ${question.correctAnswer}) ${question.options[question.correctAnswer.charCodeAt(0) - 65]}`;
          doc.setFont(undefined, 'bold');
          doc.text(correctAnswer, 25, yPos);
        } else {
          const correctAnswer = `Correct Answer: ${question.correctAnswer}`;
          doc.setFont(undefined, 'bold');
          doc.text(correctAnswer, 25, yPos);
        }

        doc.setFont(undefined, 'normal');
        yPos += 7;

        const details = `Marks: ${question.marks} | Difficulty: ${question.difficulty}`;
        doc.text(details, 25, yPos);
        yPos += 10;
      });

      doc.setFontSize(9);
      doc.text("Answer key generated from PDF content", 105, 280, { align: 'center' });

      doc.save(`Answer_Key_${Date.now()}.pdf`);
    }

    function printExam() {
      const printContent = document.getElementById('examPreview').innerHTML;
      const originalContent = document.body.innerHTML;

      document.body.innerHTML = `
        <html>
        <head>
          <title>Print Exam</title>
          <style>
            body { 
              font-family: 'Times New Roman', serif; 
              margin: 30px;
              font-size: 12pt;
              direction: ${selectedLanguage === 'Bengali' ? 'rtl' : 'ltr'};
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
            .exam-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .question {
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 1px dashed #ccc;
            }
          </style>
        </head>
        <body>
          <div class="exam-header">
            <h1>${document.getElementById('examTitle').value || 'Generated Exam'}</h1>
            <p>${document.getElementById('previewExamDetails').textContent}</p>
          </div>
          ${printContent}
          <div class="no-print" style="text-align: center; margin-top: 50px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer;">
              <i class="fas fa-print"></i> Print
            </button>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              <i class="fas fa-times"></i> Close
            </button>
          </div>
        </body>
        </html>
      `;

      window.print();
      document.body.innerHTML = originalContent;
    }

    function createNewExam() {
      pdfFile = null;
      extractedText = "";
      generatedQuestions = [];
      usingFallbackMode = false;
      extractedTopics = [];

      document.getElementById('pdfPreview').classList.add('hidden');
      document.getElementById('pdfInput').value = '';
      document.getElementById('examTitle').value = '';
      document.getElementById('questionCount').value = '10';
      document.getElementById('extractedTextPreview').classList.add('hidden');
      document.getElementById('aiResponsePreview').classList.add('hidden');
      document.getElementById('fallbackMode').classList.add('hidden');
      document.getElementById('errorMessage').classList.add('hidden');
      document.getElementById('detectedTopics').classList.add('hidden');

      goToStep(1);
    }
  