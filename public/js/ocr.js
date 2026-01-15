
    // Global variables
    let uploadedFiles = [];
    let extractedQuestions = [];
    let rawOCRText = "";
    let selectedLanguage = "eng";
    let allExams = JSON.parse(localStorage.getItem('ocrExams')) || [];
    let tesseractWorker = null;

    // Initialize
    document.addEventListener('DOMContentLoaded', function () {
      console.log("Tesseract.js Loaded:", typeof Tesseract !== 'undefined');

      // Initialize Tesseract worker
      initializeTesseract();

      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('examDate').value = today;
    });

    // Step Navigation Functions
    function goToStep(step) {
      // Hide all steps
      for (let i = 1; i <= 4; i++) {
        document.getElementById(`step${i}Section`).classList.add('hidden');
        document.getElementById(`step${i}`).classList.remove('active', 'completed');
      }

      // Show current step
      document.getElementById(`step${step}Section`).classList.remove('hidden');
      document.getElementById(`step${step}`).classList.add('active');

      // Mark previous steps as completed
      for (let i = 1; i < step; i++) {
        document.getElementById(`step${i}`).classList.add('completed');
      }

      // Step-specific actions
      switch (step) {
        case 1:
          // Reset upload area if no files
          if (uploadedFiles.length === 0) {
            resetUploadArea();
          }
          break;
        case 3:
          loadExtractedQuestions();
          updateExamPreview();
          break;
        case 4:
          generateExamPreview();
          break;
      }
    }

    function resetUploadArea() {
      document.getElementById('uploadArea').classList.remove('dragover');
      document.getElementById('nextStep1Btn').disabled = true;
    }

    // File Upload Functions
    function handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('uploadArea').classList.add('dragover');
    }

    function handleDragLeave(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('uploadArea').classList.remove('dragover');
    }

    function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('uploadArea').classList.remove('dragover');

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    }

    function handleFileSelect(files) {
      const validFiles = Array.from(files).filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
          alert(`File type not supported: ${file.name}\nSupported: JPG, PNG, PDF`);
          return false;
        }

        if (file.size > maxSize) {
          alert(`File too large: ${file.name} (max 5MB)`);
          return false;
        }

        return true;
      });

      uploadedFiles = [...uploadedFiles, ...validFiles];
      displayFileList();

      // Enable process button if files are uploaded
      document.getElementById('nextStep1Btn').disabled = uploadedFiles.length === 0;
    }

    function displayFileList() {
      const fileList = document.getElementById('fileList');

      if (uploadedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
      }

      let html = '<div style="background: white; border-radius: 10px; padding: 20px; border: 2px solid #e2e8f0;">';
      html += '<h4 style="margin-bottom: 15px; color: #1a202c;">Selected Files (' + uploadedFiles.length + '):</h4>';

      uploadedFiles.forEach((file, index) => {
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        const fileIcon = getFileIcon(file.type);

        html += `
                    <div class="file-item">
                        <div class="file-info">
                            <div class="file-icon">${fileIcon}</div>
                            <div>
                                <div class="file-name">${file.name}</div>
                                <div class="file-size">${fileSize} MB • ${file.type.split('/')[1].toUpperCase()}</div>
                            </div>
                        </div>
                        <button class="remove-btn" onclick="removeFile(${index})" title="Remove file">
                            ×
                        </button>
                    </div>
                `;
      });

      html += '</div>';
      fileList.innerHTML = html;
    }

    function getFileIcon(fileType) {
      if (fileType.includes('image')) return '🖼️';
      if (fileType.includes('pdf')) return '📄';
      return '📁';
    }

    function removeFile(index) {
      uploadedFiles.splice(index, 1);
      displayFileList();
      document.getElementById('nextStep1Btn').disabled = uploadedFiles.length === 0;
    }

    // Language Selection
    function selectLanguage(lang) {
      selectedLanguage = lang;

      // Update button states
      document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');

      console.log("Selected language:", lang);
    }

    // Initialize Tesseract
    async function initializeTesseract() {
      try {
        // Create Tesseract worker
        tesseractWorker = await Tesseract.createWorker({
          logger: (m) => {
            console.log("Tesseract Log:", m);
            if (m.status === 'recognizing text') {
              document.getElementById('progressText').textContent = `Recognizing text... (${Math.round(m.progress * 100)}%)`;
            }
          }
        });
        console.log("Tesseract worker initialized");
      } catch (error) {
        console.error("Error initializing Tesseract:", error);
        alert("Error initializing OCR engine. Please refresh the page.");
      }
    }

    // Main OCR Function
    async function startRealOCR() {
      if (uploadedFiles.length === 0) {
        alert("Please upload at least one file first!");
        return;
      }

      // Go to step 2
      goToStep(2);

      const progressBar = document.getElementById('progressBar');
      const progressText = document.getElementById('progressText');
      const processingTitle = document.getElementById('processingTitle');
      const fileProcessingStatus = document.getElementById('fileProcessingStatus');

      // Reset progress
      progressBar.style.width = '0%';
      progressText.textContent = 'Initializing OCR engine...';
      processingTitle.textContent = 'Processing with Tesseract.js OCR...';
      fileProcessingStatus.innerHTML = '';
      rawOCRText = "";

      try {
        // Initialize worker with selected language
        if (!tesseractWorker) {
          await initializeTesseract();
        }

        await tesseractWorker.loadLanguage(selectedLanguage);
        await tesseractWorker.initialize(selectedLanguage);

        // Process each uploaded file
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];

          // Update progress
          const progressPercent = Math.round((i / uploadedFiles.length) * 100);
          progressBar.style.width = progressPercent + '%';
          fileProcessingStatus.innerHTML = `Processing file ${i + 1} of ${uploadedFiles.length}: ${file.name}`;
          progressText.textContent = `Extracting text from ${file.name}...`;

          // Create image URL from file
          const imageUrl = URL.createObjectURL(file);

          try {
            // Perform OCR
            progressText.textContent = `Running OCR on ${file.name}...`;

            const { data: { text } } = await tesseractWorker.recognize(imageUrl);

            rawOCRText += `\n\n=== File: ${file.name} ===\n${text}`;

            console.log(`Extracted text from ${file.name}:`, text.substring(0, 200) + "...");

            // Update progress
            progressBar.style.width = Math.round(((i + 1) / uploadedFiles.length) * 100) + '%';
            progressText.textContent = `Completed ${i + 1} of ${uploadedFiles.length} files`;

          } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            rawOCRText += `\n\n=== Error processing ${file.name} ===\n${error.message}`;
          } finally {
            URL.revokeObjectURL(imageUrl);
          }
        }

        // OCR Processing Complete
        progressText.textContent = 'OCR Processing Complete!';
        processingTitle.textContent = 'OCR Processing Complete!';

        // Show extracted text
        document.getElementById('rawText').textContent = rawOCRText || "No text was extracted.";
        document.getElementById('extractedTextPreview').classList.remove('hidden');

        // Auto-process into questions
        setTimeout(() => {
          processExtractedText();
        }, 1000);

      } catch (error) {
        console.error("OCR Error:", error);
        progressText.textContent = `Error: ${error.message}`;
        alert("OCR processing failed. Please try again with clearer images.");

        // Show whatever text was extracted
        if (rawOCRText) {
          document.getElementById('rawText').textContent = rawOCRText;
          document.getElementById('extractedTextPreview').classList.remove('hidden');
        }
      }
    }

    // Process extracted text into questions
    function processExtractedText() {
      if (!rawOCRText || rawOCRText.trim() === "") {
        alert("No text was extracted from the images.");
        return;
      }

      // Clear existing questions
      extractedQuestions = [];

      // Split text into lines
      const lines = rawOCRText.split('\n').filter(line => line.trim() !== '');

      let questionBuffer = [];
      let questionNumber = 1;
      let inQuestion = false;

      // Pattern matching for question detection
      const questionPatterns = [
        /^\d+[\.\)]\s*/,          // 1. or 1)
        /^\([a-d]\)\s*/i,         // (a) or (A)
        /^[a-d]\.\s*/i,           // a. or A.
        /^Question\s*\d+/i,       // Question 1
        /^Q\.?\s*\d+/i,           // Q.1 or Q1
        /^\*\s*/,                 // *
        /^-\s*/,                  // -
        /^\(\d+\)\s*/,            // (1)
      ];

      const marksPattern = /\[(\d+)\s*(?:marks|mark)\]/i;
      const marksPattern2 = /\((\d+)\s*(?:marks|mark)\)/i;

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        // Check if line starts a new question
        const isQuestionStart = questionPatterns.some(pattern => pattern.test(trimmedLine));

        if (isQuestionStart) {
          // Save previous question if exists
          if (questionBuffer.length > 0) {
            saveQuestion(questionBuffer, questionNumber);
            questionNumber++;
            questionBuffer = [];
          }

          questionBuffer.push(trimmedLine);
          inQuestion = true;

        } else if (inQuestion) {
          // Check for marks in the line
          const marksMatch = trimmedLine.match(marksPattern) || trimmedLine.match(marksPattern2);

          if (marksMatch) {
            // This line contains marks info
            questionBuffer.push(trimmedLine);
            saveQuestion(questionBuffer, questionNumber);
            questionNumber++;
            questionBuffer = [];
            inQuestion = false;
          } else if (trimmedLine.length > 10) { // Minimum line length for continuation
            questionBuffer.push(trimmedLine);
          } else {
            // Short line might be the end of question
            if (questionBuffer.length > 0) {
              saveQuestion(questionBuffer, questionNumber);
              questionNumber++;
              questionBuffer = [];
              inQuestion = false;
            }
          }
        }
      });

      // Save last question if exists
      if (questionBuffer.length > 0) {
        saveQuestion(questionBuffer, questionNumber);
      }

      // If no questions were found with pattern matching, create one big question
      if (extractedQuestions.length === 0 && rawOCRText.length > 50) {
        extractedQuestions.push({
          id: 1,
          text: rawOCRText.substring(0, 500) + "...",
          marks: 10,
          type: "descriptive",
          options: [],
          correctAnswer: 0,
          category: "Extracted",
          source: "Full OCR Text"
        });
      }

      console.log(`Processed ${extractedQuestions.length} questions from OCR text`);

      // Enable next button
      document.getElementById('nextStep2Btn').disabled = false;

      // Go to step 3 automatically
      setTimeout(() => {
        goToStep(3);
      }, 500);
    }

    function saveQuestion(lines, questionNumber) {
      if (lines.length === 0) return;

      const fullText = lines.join(' ');

      // Extract marks
      let marks = 5; // Default
      const marksMatch = fullText.match(/\[(\d+)\s*(?:marks|mark)\]/i) ||
        fullText.match(/\((\d+)\s*(?:marks|mark)\)/i);
      if (marksMatch) {
        marks = parseInt(marksMatch[1]);
      }

      // Determine question type
      let type = "descriptive";
      if (fullText.toLowerCase().includes("choose") ||
        fullText.toLowerCase().includes("option") ||
        fullText.match(/[a-d]\./gi)) {
        type = "mcq";
      } else if (fullText.length < 100) {
        type = "short";
      } else if (fullText.length > 300) {
        type = "essay";
      }

      // Extract options for MCQ
      let options = [];
      let correctAnswer = 0;

      if (type === "mcq") {
        // Simple option extraction
        const optionLines = lines.filter(line =>
          line.match(/^[a-d][\.\)]\s*/i) ||
          line.match(/^\([a-d]\)\s*/i)
        );

        if (optionLines.length > 0) {
          options = optionLines.map(line => line.replace(/^[a-d][\.\)]\s*/i, '').replace(/^\([a-d]\)\s*/i, ''));
        } else {
          // Try to extract options from text
          const optionPattern = /[a-d]\.\s*[^a-d\.\)]+/gi;
          const matches = fullText.match(optionPattern);
          if (matches) {
            options = matches.map(match => match.replace(/[a-d]\.\s*/i, '').trim());
          }
        }

        // If no options found, change type
        if (options.length < 2) {
          type = "short";
          options = [];
        }
      }

      // Clean question text (remove marks pattern)
      let cleanText = fullText.replace(/\[(\d+)\s*(?:marks|mark)\]/gi, '')
        .replace(/\((\d+)\s*(?:marks|mark)\)/gi, '')
        .trim();

      // Remove question number prefix if present
      cleanText = cleanText.replace(/^\d+[\.\)]\s*/, '')
        .replace(/^Question\s*\d+[:\.\s]*/i, '')
        .replace(/^Q\.?\s*\d+[:\.\s]*/i, '');

      extractedQuestions.push({
        id: extractedQuestions.length + 1,
        text: cleanText,
        marks: marks,
        type: type,
        options: options,
        correctAnswer: correctAnswer,
        category: "Extracted",
        source: "OCR"
      });
    }

    function autoDetectQuestions() {
      if (rawOCRText) {
        processExtractedText();
        loadExtractedQuestions();
      } else {
        alert("No OCR text available. Please process images first.");
      }
    }

    function loadExtractedQuestions() {
      const container = document.getElementById('questionsContainer');
      const noQuestionsMessage = document.getElementById('noQuestionsMessage');

      if (extractedQuestions.length === 0) {
        noQuestionsMessage.style.display = 'block';
        container.innerHTML = '<div id="noQuestionsMessage" style="text-align: center; padding: 40px; color: #64748b;"><div style="font-size: 3rem; margin-bottom: 20px;">📝</div><h4 style="margin-bottom: 10px;">No Questions Found</h4><p>OCR processing will extract questions from your uploaded files.</p></div>';
        updateQuestionStats();
        return;
      }

      noQuestionsMessage.style.display = 'none';

      let html = '';

      extractedQuestions.forEach((question, index) => {
        const questionNumber = index + 1;

        html += `
                    <div class="question-item" id="question-${question.id}" style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <span style="background: #e2e8f0; padding: 4px 12px; border-radius: 20px; 
                                      font-size: 0.9rem; font-weight: 600; min-width: 40px; text-align: center;">
                                    Q${questionNumber}
                                </span>
                                <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; 
                                      font-size: 0.9rem; font-weight: 600;">
                                    ${question.marks} marks
                                </span>
                                <span style="color: #64748b; font-size: 0.9rem; background: #f8fafc; 
                                      padding: 4px 12px; border-radius: 20px; text-transform: capitalize;">
                                    ${question.type}
                                </span>
                            </div>
                            <div>
                                <button onclick="editQuestion(${question.id})" style="background: #3b82f6; color: white; 
                                        border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                                    ✏️ Edit
                                </button>
                                <button onclick="deleteQuestion(${question.id})" style="background: #ef4444; color: white; 
                                        border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                        
                        <div class="question-details">
                            <div style="font-weight: 600; margin-bottom: 5px; color: #1a202c;">Question:</div>
                            <div>${question.text}</div>
                        </div>
                        
                        ${question.type === 'mcq' && question.options.length > 0 ? `
                            <div style="margin-top: 10px;">
                                <div style="font-weight: 600; margin-bottom: 5px; color: #1a202c;">Options:</div>
                                <div style="padding-left: 20px;">
                                    ${question.options.map((opt, i) => `
                                        <div style="margin-bottom: 5px; color: #4a5568;">
                                            ${String.fromCharCode(65 + i)}. ${opt}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; gap: 15px; align-items: center; padding-top: 15px; border-top: 2px solid #e2e8f0;">
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <span style="color: #64748b; font-size: 0.9rem;">Type:</span>
                                <select onchange="updateQuestionType(${question.id}, this.value)" 
                                        style="padding: 6px 12px; border: 2px solid #e2e8f0; border-radius: 6px; background: white;">
                                    <option value="mcq" ${question.type === 'mcq' ? 'selected' : ''}>MCQ</option>
                                    <option value="short" ${question.type === 'short' ? 'selected' : ''}>Short Answer</option>
                                    <option value="descriptive" ${question.type === 'descriptive' ? 'selected' : ''}>Descriptive</option>
                                    <option value="essay" ${question.type === 'essay' ? 'selected' : ''}>Essay</option>
                                </select>
                            </div>
                            
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <span style="color: #64748b; font-size: 0.9rem;">Marks:</span>
                                <input type="number" value="${question.marks}" min="1" max="100" 
                                       onchange="updateQuestionMarks(${question.id}, this.value)"
                                       style="padding: 6px 12px; border: 2px solid #e2e8f0; border-radius: 6px; width: 80px;">
                            </div>
                        </div>
                    </div>
                `;
      });

      container.innerHTML = html;
      updateQuestionStats();
    }

    function updateQuestionStats() {
      const totalQuestions = extractedQuestions.length;
      const totalMarks = extractedQuestions.reduce((sum, q) => sum + q.marks, 0);

      document.getElementById('totalQuestions').textContent = totalQuestions;
      document.getElementById('totalMarks').value = totalMarks;
    }

    function addNewQuestion() {
      const newId = extractedQuestions.length > 0 ?
        Math.max(...extractedQuestions.map(q => q.id)) + 1 : 1;

      const newQuestion = {
        id: newId,
        text: "Enter your new question here...",
        marks: 5,
        type: "mcq",
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswer: 0,
        category: "Manual",
        source: "Manual"
      };

      extractedQuestions.push(newQuestion);
      loadExtractedQuestions();
    }

    function editQuestion(id) {
      const question = extractedQuestions.find(q => q.id === id);
      if (question) {
        const newText = prompt("Edit question text:", question.text);
        if (newText !== null && newText.trim() !== '') {
          question.text = newText;
          loadExtractedQuestions();
        }
      }
    }

    function deleteQuestion(id) {
      if (confirm("Are you sure you want to delete this question?")) {
        extractedQuestions = extractedQuestions.filter(q => q.id !== id);
        loadExtractedQuestions();
      }
    }

    function updateQuestionType(id, type) {
      const question = extractedQuestions.find(q => q.id === id);
      if (question) {
        question.type = type;
        loadExtractedQuestions();
      }
    }

    function updateQuestionMarks(id, marks) {
      const question = extractedQuestions.find(q => q.id === id);
      if (question) {
        question.marks = parseInt(marks) || 1;
        updateQuestionStats();
      }
    }

    function generateExamPreview() {
      const preview = document.getElementById('examPreview');
      const title = document.getElementById('examTitle').value || "Untitled Exam";
      const date = document.getElementById('examDate').value;
      const duration = document.getElementById('examDuration').value;
      const totalMarks = document.getElementById('totalMarks').value;
      const instructions = document.getElementById('examInstructions').value;

      let html = `
                <div style="padding: 20px;">
                    <h3 style="color: #1a202c; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                        ${title}
                    </h3>
                    
                    <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div>
                            <div style="color: #64748b; font-size: 0.9rem;">Date</div>
                            <div style="font-weight: 600; color: #1a202c;">${date}</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 0.9rem;">Duration</div>
                            <div style="font-weight: 600; color: #1a202c;">${duration} minutes</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 0.9rem;">Total Marks</div>
                            <div style="font-weight: 600; color: #1a202c;">${totalMarks}</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 0.9rem;">Questions</div>
                            <div style="font-weight: 600; color: #1a202c;">${extractedQuestions.length}</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: 600; color: #1a202c; margin-bottom: 10px;">Instructions:</div>
                        <div style="white-space: pre-line; color: #4a5568; padding: 10px; background: #f8fafc; border-radius: 8px;">
                            ${instructions}
                        </div>
                    </div>
                </div>
            `;

      preview.innerHTML = html;
    }

    function saveExam() {
      const title = document.getElementById('examTitle').value.trim();
      const date = document.getElementById('examDate').value;
      const duration = parseInt(document.getElementById('examDuration').value);
      const totalMarks = parseInt(document.getElementById('totalMarks').value);
      const examClass = document.getElementById('examClass').value.trim();
      const instructions = document.getElementById('examInstructions').value.trim();

      // Validation
      if (!title) {
        alert("Please enter an exam title!");
        document.getElementById('examTitle').focus();
        return;
      }

      if (extractedQuestions.length === 0) {
        alert("Please add at least one question!");
        goToStep(3);
        return;
      }

      // Generate unique exam ID
      const examId = 'exam_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Create exam object
      const exam = {
        id: examId,
        title: title,
        class: examClass || 'All Classes',
        date: date,
        duration: duration,
        totalMarks: totalMarks,
        questions: JSON.parse(JSON.stringify(extractedQuestions)),
        instructions: instructions,
        createdAt: new Date().toISOString(),
        status: 'draft',
        shareLink: `${window.location.origin}/exam/${examId}`,
        shortCode: generateShortCode(),
        responses: 0,
        averageScore: 0
      };

      // Save to localStorage
      allExams.push(exam);
      localStorage.setItem('ocrExams', JSON.stringify(allExams));

      // Show success message
      document.getElementById('step4Section').classList.add('hidden');
      document.getElementById('successMessage').classList.remove('hidden');

      // Update success message with exam details
      document.getElementById('examLinkMessage').innerHTML = `
                <strong>${title}</strong><br>
                Total Questions: ${exam.questions.length} | Total Marks: ${totalMarks}<br><br>
                Share this link with students:<br>
                <code style="background: #f8fafc; padding: 10px; border-radius: 5px; display: inline-block; margin-top: 10px;">
                    ${exam.shareLink}
                </code><br><br>
                Exam Code: <strong>${exam.shortCode}</strong>
            `;
    }

    function generateShortCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }

    function createNewExam() {
      // Reset everything
      uploadedFiles = [];
      extractedQuestions = [];
      rawOCRText = "";

      // Reset form fields
      document.getElementById('examTitle').value = '';
      document.getElementById('examClass').value = '';
      document.getElementById('examDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('examDuration').value = '120';
      document.getElementById('totalMarks').value = '100';

      // Hide success message and go to step 1
      document.getElementById('successMessage').classList.add('hidden');
      goToStep(1);

      // Clear file list
      document.getElementById('fileList').innerHTML = '';
    }

    // Initialize to step 1
    goToStep(1);
  