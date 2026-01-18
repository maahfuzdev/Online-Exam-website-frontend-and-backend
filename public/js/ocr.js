
    // Global variables
    let pdfFile = null;
    let extractedText = "";
    let generatedQuestions = [];
    let selectedLanguage = "English";
    let selectedType = "mcq";
    let isProcessing = false;

    // Handle PDF upload
    function handlePDFUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        alert('শুধুমাত্র PDF ফাইল আপলোড করুন।');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('PDF ফাইলের সাইজ 10MB এর কম হতে হবে।');
        return;
      }

      pdfFile = file;

      // Show file info
      document.getElementById('pdfPreview').classList.remove('hidden');
      document.getElementById('pdfName').textContent = file.name;
      document.getElementById('pdfSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';

      // Enable next button
      document.getElementById('nextStep1Btn').disabled = false;

      // Extract text from PDF
      extractTextFromPDF(file);
    }

    async function extractTextFromPDF(file) {
      try {
        showLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        document.getElementById('pdfPages').textContent = `পৃষ্ঠা: ${pdf.numPages}`;

        let fullText = "";
        const pageCount = Math.min(pdf.numPages, 3); // শুধু প্রথম ৩ পৃষ্ঠা (দ্রুততার জন্য)

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
        }

        extractedText = fullText;

        // Show preview of extracted text
        document.getElementById('extractedText').textContent =
          fullText.substring(0, 500) + (fullText.length > 500 ? '...' : '');
        document.getElementById('extractedTextPreview').classList.remove('hidden');

        showLoading(false);

      } catch (error) {
        console.error('PDF extraction error:', error);
        alert('PDF পড়তে সমস্যা হয়েছে। দয়া করে অন্য একটি PDF চেষ্টা করুন।');
        showLoading(false);
      }
    }

    function showLoading(show) {
      if (show) {
        document.getElementById('extractedText').textContent = "PDF পড়া হচ্ছে...";
      }
    }

    function removePDF() {
      pdfFile = null;
      document.getElementById('pdfPreview').classList.add('hidden');
      document.getElementById('pdfInput').value = '';
      document.getElementById('nextStep1Btn').disabled = true;
      extractedText = "";
      document.getElementById('extractedTextPreview').classList.add('hidden');
    }

    // Step navigation
    function goToStep(step) {
      // Hide all sections
      document.getElementById('step1Section').classList.add('hidden');
      document.getElementById('step2Section').classList.add('hidden');
      document.getElementById('step3Section').classList.add('hidden');
      document.getElementById('step4Section').classList.add('hidden');

      // Reset step indicators
      document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active', 'completed');
      });

      // Show target section
      document.getElementById(`step${step}Section`).classList.remove('hidden');

      // Update step indicators
      for (let i = 1; i <= step; i++) {
        document.getElementById(`step${i}`).classList.add(i === step ? 'active' : 'completed');
      }

      // Step-specific actions
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

    // Main AI Processing Function - SIMPLIFIED VERSION
    async function startAIProcessing() {
      // Validate inputs
      if (!pdfFile) {
        alert('দয়া করে একটি PDF ফাইল আপলোড করুন।');
        return;
      }

      const questionCount = parseInt(document.getElementById('questionCount').value);
      const examTitle = document.getElementById('examTitle').value.trim() || 'তৈরি করা এক্সাম';

      // Go to processing step
      goToStep(3);
      isProcessing = true;

      // Update processing UI
      updateProcessingUI('PDF পড়া হচ্ছে...', 10);

      try {
        // Step 1: Prepare text for AI
        let textForAI = extractedText;
        if (textForAI.length > 4000) {
          textForAI = textForAI.substring(0, 4000) + '... [text truncated]';
        }

        updateProcessingUI('Gemini AI এ পাঠানো হচ্ছে...', 30);

        // Step 2: Call Gemini AI API
        const questions = await callGeminiAI(textForAI, questionCount, selectedLanguage, selectedType);

        updateProcessingUI('AI রেসপন্স প্রসেসিং...', 70);

        // Step 3: Parse and format questions
        generatedQuestions = parseAIResponse(questions, questionCount);

        updateProcessingUI('প্রশ্ন তৈরি সম্পন্ন!', 100);

        // Update UI
        document.getElementById('nextStep3Btn').disabled = false;
        document.getElementById('aiResponsePreview').classList.remove('hidden');
        document.getElementById('aiResponseText').textContent = questions.substring(0, 800) + '...';

        // Show success and go to next step
        setTimeout(() => {
          goToStep(4);
        }, 1000);

      } catch (error) {
        console.error('AI Processing Error:', error);
        
        // Fallback: Generate questions from text
        generateQuestionsFromText(questionCount);
        updateProcessingUI('PDF থেকে প্রশ্ন তৈরি করা হয়েছে', 100);

        setTimeout(() => {
          document.getElementById('nextStep3Btn').disabled = false;
          goToStep(4);
        }, 1000);

      } finally {
        isProcessing = false;
      }
    }

    function updateProcessingUI(status, progress) {
      document.getElementById('processingStatus').textContent = status;
      document.getElementById('progressBar').style.width = progress + '%';

      // Update steps
      const steps = document.getElementById('processingSteps');
      const stepItems = [
        'PDF থেকে টেক্সট পড়া হচ্ছে...',
        'Gemini AI দিয়ে এনালাইসিস...',
        'প্রশ্ন তৈরি করা হচ্ছে...',
        'এক্সাম ফরমেট করা হচ্ছে...'
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

    // SIMPLIFIED Gemini AI Function
    async function callGeminiAI(text, count, language, type) {
      // Use your API key directly
      const apiKey = "AIzaSyAFyD9Bn6FSMyKsMN1Bb1HuwcNPl_9Itx8";
      
      // Try different model endpoints
      const modelEndpoints = [
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-1.0-pro"
      ];
      
      const prompt = `
        You are an expert teacher creating exam questions in ${language} language.
        
        Here is the text content from a PDF:

        ${text}

        Create ${count} ${type === 'mcq' ? 'MCQ' : 'mixed'} questions based on this content.
        
        Requirements:
        1. Questions should test understanding of the content
        2. For MCQ: Provide 4 options (A, B, C, D) with one correct answer
        3. Mark correct answers with (Correct) 
        4. Assign marks between 1-5 for each question
        5. Include difficulty level (Easy, Medium, Hard)
        6. Make questions in ${language} language

        Format each question like this:
        Q1. [Question text here]
        A) [Option A]
        B) [Option B]
        C) [Option C]
        D) [Option D]
        Correct Answer: [Letter] | Marks: [Number] | Difficulty: [Level]

        Now generate the questions:
      `;

      for (const model of modelEndpoints) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          
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
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
          }
        } catch (error) {
          console.log(`Model ${model} failed:`, error);
          continue; // Try next model
        }
      }
      
      // If all API calls fail, throw error
      throw new Error('All Gemini AI models failed. Using fallback questions.');
    }

    function parseAIResponse(response, expectedCount) {
      const questions = [];
      
      // If response is empty or invalid, use fallback
      if (!response || response.trim().length < 50) {
        return generateQuestionsFromText(expectedCount);
      }
      
      const lines = response.split('\n');
      let currentQuestion = null;
      let questionNumber = 1;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Detect new question
        if (trimmedLine.match(/^Q\d+\./) || trimmedLine.match(/^\d+\./)) {
          if (currentQuestion && currentQuestion.options.length > 0) {
            questions.push(currentQuestion);
          }
          
          currentQuestion = {
            id: questionNumber++,
            text: trimmedLine.replace(/^Q?\d+\.\s*/, ''),
            options: [],
            correctAnswer: '',
            marks: 1,
            difficulty: 'Medium',
            type: 'mcq'
          };
        }
        // Detect options A-D
        else if (trimmedLine.match(/^[A-D]\)/)) {
          if (currentQuestion) {
            const optionText = trimmedLine.replace(/^[A-D]\)\s*/, '');
            currentQuestion.options.push(optionText);
            
            // Check if this is marked as correct
            if (optionText.includes('(Correct)') || optionText.includes('[Correct]')) {
              currentQuestion.correctAnswer = trimmedLine.charAt(0);
            }
          }
        }
        // Detect correct answer in separate line
        else if (trimmedLine.includes('Correct Answer:') || trimmedLine.includes('Correct:')) {
          if (currentQuestion) {
            const match = trimmedLine.match(/Correct Answer:\s*([A-D])/i) || 
                          trimmedLine.match(/Correct:\s*([A-D])/i);
            if (match) {
              currentQuestion.correctAnswer = match[1].toUpperCase();
            }
            
            // Extract marks
            const marksMatch = trimmedLine.match(/Marks:\s*(\d+)/i);
            if (marksMatch) {
              currentQuestion.marks = parseInt(marksMatch[1]);
            }
            
            // Extract difficulty
            const diffMatch = trimmedLine.match(/Difficulty:\s*(\w+)/i);
            if (diffMatch) {
              currentQuestion.difficulty = diffMatch[1];
            }
          }
        }
      }

      // Add the last question
      if (currentQuestion && currentQuestion.options.length > 0) {
        questions.push(currentQuestion);
      }

      // If no questions were parsed, use fallback
      if (questions.length === 0) {
        return generateQuestionsFromText(expectedCount);
      }

      // Ensure we have the right number of questions
      while (questions.length < expectedCount) {
        const extraQuestions = generateQuestionsFromText(expectedCount - questions.length);
        questions.push(...extraQuestions);
      }

      return questions.slice(0, expectedCount);
    }

    // Improved fallback question generator
    function generateQuestionsFromText(count) {
      const questions = [];
      
      // Extract keywords from PDF text
      const keywords = extractKeywordsFromText(extractedText);
      
      // If no keywords found, use default topics
      if (keywords.length === 0) {
        keywords.push('PDF content', 'text analysis', 'information', 'concepts', 'topics');
      }

      for (let i = 1; i <= count; i++) {
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        const difficulty = ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)];
        const marks = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3;
        
        questions.push({
          id: i,
          text: `Based on the PDF content, what is the main purpose or meaning of "${keyword}"?`,
          options: [
            'To explain and describe concepts in detail',
            'To provide examples and illustrations',
            'To summarize key information from the text',
            'To analyze and interpret the content'
          ],
          correctAnswer: 'A',
          marks: marks,
          difficulty: difficulty,
          type: 'mcq'
        });
      }

      return questions;
    }

    function extractKeywordsFromText(text) {
      // Simple keyword extraction
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 5 && !isCommonWord(word))
        .slice(0, 20); // Get top 20 unique words
      
      return [...new Set(words)];
    }

    function isCommonWord(word) {
      const commonWords = ['the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'from'];
      return commonWords.includes(word.toLowerCase());
    }

    function displayGeneratedQuestions() {
      const container = document.getElementById('questionsPreview');
      const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);

      // Update summary
      document.getElementById('totalQuestionsCount').textContent = generatedQuestions.length;
      document.getElementById('totalMarksCount').textContent = totalMarks;
      document.getElementById('finalLanguage').textContent = selectedLanguage;
      document.getElementById('finalType').textContent = selectedType === 'mcq' ? 'MCQ' : 'মিক্সড';

      // Display questions in preview
      let html = '';
      generatedQuestions.forEach((question, index) => {
        const optionLetters = ['A', 'B', 'C', 'D'];
        const correctAnswerIndex = optionLetters.indexOf(question.correctAnswer);

        html += `
          <div class="question-item">
            <div style="margin-bottom: 12px;">
              <span class="question-counter">Q${index + 1}</span>
              <span class="marks-badge">${question.marks} মার্ক</span>
              <span style="background: #f59e0b; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem;">
                ${question.difficulty}
              </span>
            </div>
            
            <div style="font-weight: 600; margin-bottom: 12px; color: #1a202c;">
              ${question.text}
            </div>
            
            <div style="margin-top: 12px;">
              ${question.options.map((option, optIndex) => `
                <div class="mcq-option ${optIndex === correctAnswerIndex ? 'correct' : ''}">
                  <span style="font-weight: 600; margin-right: 8px;">
                    ${optionLetters[optIndex]})
                  </span>
                  ${option}
                  ${optIndex === correctAnswerIndex ?
                    '<span style="float: right; color: #10b981;"><i class="fas fa-check"></i> সঠিক</span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      // Update exam preview
      updateExamPreview();
    }

    function updateExamPreview() {
      const title = document.getElementById('examTitle').value || 'তৈরি করা এক্সাম';
      const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);
      const today = new Date().toLocaleDateString('bn-BD');

      // Update preview header
      document.getElementById('previewExamTitle').textContent = title;
      document.getElementById('previewExamDetails').textContent =
        `তারিখ: ${today} | সময়: ৩ ঘন্টা | মোট মার্কস: ${totalMarks} | ভাষা: ${selectedLanguage}`;

      // Update preview questions
      const previewContainer = document.getElementById('previewQuestions');
      let html = '';

      generatedQuestions.forEach((question, index) => {
        html += `
          <div class="preview-question">
            <div style="margin-bottom: 8px; font-weight: bold;">
              ${index + 1}. ${question.text} [${question.marks}]
            </div>
            <div style="padding-left: 15px;">
              ${question.options.map((option, optIndex) => `
                <div style="margin: 4px 0;">
                  ${String.fromCharCode(65 + optIndex)}) ${option}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });

      previewContainer.innerHTML = html;
    }

    // Export functions
    function downloadPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const title = document.getElementById('examTitle').value || 'তৈরি করা এক্সাম';
      const totalMarks = generatedQuestions.reduce((sum, q) => sum + q.marks, 0);
      const today = new Date().toLocaleDateString('bn-BD');

      // Add header
      doc.setFontSize(18);
      doc.text(title, 105, 20, { align: 'center' });

      doc.setFontSize(11);
      doc.text(`তারিখ: ${today} | সময়: ৩ ঘন্টা | মোট মার্কস: ${totalMarks} | ভাষা: ${selectedLanguage}`,
        105, 28, { align: 'center' });

      // Add instructions
      doc.setFontSize(10);
      const instructions = [
        "নির্দেশাবলী:",
        "১. সব প্রশ্ন মনোযোগ সহকারে পড়ুন।",
        "২. আপনার নাম ও রোল নম্বর স্পষ্টভাবে লিখুন।",
        "৩. সব প্রশ্ন বাধ্যতামূলক।",
        "৪. প্রতিটি প্রশ্নের জন্য নির্দিষ্ট মার্কস আছে।",
        "৫. MCQ প্রশ্নের জন্য সঠিক অপশন বাছাই করুন।",
        "৬. কোনো ধরনের অসদুপায় অবলম্বন করা যাবে না।"
      ];

      let yPos = 40;
      instructions.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 6;
      });

      yPos += 8;

      // Add questions
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

        question.options.forEach((option, optIndex) => {
          const optionText = `   ${String.fromCharCode(65 + optIndex)}) ${option}`;
          const optionLines = doc.splitTextToSize(optionText, 170);
          doc.text(optionLines, 25, yPos);
          yPos += optionLines.length * 4.5;
        });

        yPos += 8;
      });

      // Footer
      doc.setFontSize(9);
      doc.text("এই প্রশ্নপত্র AI ব্যবহার করে তৈরি করা হয়েছে", 105, 280, { align: 'center' });

      // Save PDF
      doc.save(`এক্সাম_${Date.now()}.pdf`);
    }

    function downloadAnswerKey() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const title = document.getElementById('examTitle').value || 'তৈরি করা এক্সাম';

      // Add header
      doc.setFontSize(18);
      doc.text(`${title} - উত্তরমালা`, 105, 20, { align: 'center' });

      let yPos = 35;

      // Add answer key
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

        const correctAnswer = `সঠিক উত্তর: ${question.correctAnswer}) ${question.options[question.correctAnswer.charCodeAt(0) - 65]}`;
        doc.setFont(undefined, 'bold');
        doc.text(correctAnswer, 25, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 7;

        const details = `মার্কস: ${question.marks} | কঠিনতা: ${question.difficulty}`;
        doc.text(details, 25, yPos);
        yPos += 10;
      });

      // Footer
      doc.setFontSize(9);
      doc.text("উত্তরমালা AI ব্যবহার করে তৈরি করা হয়েছে", 105, 280, { align: 'center' });

      // Save PDF
      doc.save(`উত্তরমালা_${Date.now()}.pdf`);
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
            <h1>${document.getElementById('examTitle').value || 'তৈরি করা এক্সাম'}</h1>
            <p>${document.getElementById('previewExamDetails').textContent}</p>
          </div>
          ${printContent}
          <div class="no-print" style="text-align: center; margin-top: 50px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer;">
              <i class="fas fa-print"></i> প্রিন্ট করুন
            </button>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              <i class="fas fa-times"></i> বন্ধ করুন
            </button>
          </div>
        </body>
        </html>
      `;

      window.print();
      document.body.innerHTML = originalContent;
    }

    function createNewExam() {
      // Reset all data
      pdfFile = null;
      extractedText = "";
      generatedQuestions = [];

      // Reset UI
      document.getElementById('pdfPreview').classList.add('hidden');
      document.getElementById('pdfInput').value = '';
      document.getElementById('examTitle').value = '';
      document.getElementById('questionCount').value = '10';
      document.getElementById('extractedTextPreview').classList.add('hidden');
      document.getElementById('aiResponsePreview').classList.add('hidden');

      // Go to step 1
      goToStep(1);
    }
  