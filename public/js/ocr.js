// Global variables
let uploadedFiles = [];
let extractedQuestions = [];
let rawOCRText = "";
let selectedLanguage = "eng";
let allExams = JSON.parse(localStorage.getItem('ocrExams')) || [];
let tesseractWorker = null;
let selectedModel = "gpt-3.5-turbo";
let openaiApiKey = localStorage.getItem('openaiApiKey') || "";

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    console.log("System Initialized");
    console.log("Tesseract.js Loaded:", typeof Tesseract !== 'undefined');
    
    // Load saved API key
    if (openaiApiKey) {
        document.getElementById('openaiApiKey').value = openaiApiKey;
        updateAIButtons();
    }
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('examDate').value = today;
    
    // Initialize to step 1
    goToStep(1);
});

// Step Navigation Functions
function goToStep(step) {
    console.log(`Going to step ${step}`);
    
    // Hide all step sections
    document.getElementById('step1Section').classList.add('hidden');
    document.getElementById('step2Section').classList.add('hidden');
    document.getElementById('step3Section').classList.add('hidden');
    document.getElementById('step4Section').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
    
    // Reset step indicators
    const steps = document.querySelectorAll('.ocr-step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Show current step section
    document.getElementById(`step${step}Section`).classList.remove('hidden');
    document.getElementById(`step${step}`).classList.add('active');
    
    // Mark previous steps as completed
    for (let i = 1; i < step; i++) {
        document.getElementById(`step${i}`).classList.add('completed');
    }
    
    // Step-specific actions
    switch (step) {
        case 1:
            if (uploadedFiles.length === 0) {
                resetUploadArea();
            }
            break;
        case 3:
            loadExtractedQuestions();
            break;
        case 4:
            generateExamPreview();
            break;
    }
    
    console.log(`Successfully navigated to step ${step}`);
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
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    console.log("Selected language:", lang);
}

// OpenAI Functions
function saveApiKey() {
    openaiApiKey = document.getElementById('openaiApiKey').value.trim();
    localStorage.setItem('openaiApiKey', openaiApiKey);
    updateAIButtons();
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('openaiApiKey');
    const icon = event.target.querySelector('i') || event.target;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function selectModel(model) {
    selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    console.log("Selected model:", model);
}

function updateAIButtons() {
    const hasKey = openaiApiKey && openaiApiKey.length > 0;
    const aiProcessBtn = document.getElementById('aiProcessBtn');
    const optimizeBtn = document.getElementById('optimizeBtn');
    
    if (aiProcessBtn) {
        aiProcessBtn.disabled = !hasKey;
        if (hasKey) {
            aiProcessBtn.title = "Use AI to enhance extracted questions";
        } else {
            aiProcessBtn.title = "Enter OpenAI API key to enable AI features";
        }
    }
    
    if (optimizeBtn) {
        optimizeBtn.disabled = !hasKey;
        if (hasKey) {
            optimizeBtn.title = "Get AI suggestions for improving questions";
        } else {
            optimizeBtn.title = "Enter OpenAI API key to enable optimization";
        }
    }
}

// ==================== ENHANCE WITH AI FUNCTION ====================
async function processWithAI() {
    console.log("processWithAI function called");
    
    if (!openaiApiKey) {
        alert("Please enter your OpenAI API key in Step 1 to use AI features.");
        goToStep(1);
        return;
    }

    if (!rawOCRText || rawOCRText.trim().length < 50) {
        alert("No sufficient text extracted. Please try OCR processing again.");
        return;
    }

    // Show loading state
    const aiProcessBtn = document.getElementById('aiProcessBtn');
    const originalText = aiProcessBtn.innerHTML;
    aiProcessBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing with AI...';
    aiProcessBtn.disabled = true;

    try {
        // Prepare the prompt for OpenAI
        const prompt = `You are an expert in educational content analysis. Analyze the following text extracted from a question paper and extract all questions in a structured format.

Extracted Text:
${rawOCRText.substring(0, 3000)} // Limit to avoid token limits

Please extract all questions and return them in this JSON format:
{
    "questions": [
        {
            "id": 1,
            "text": "Full question text here",
            "type": "mcq/short/descriptive/essay",
            "marks": 5,
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": 0,
            "category": "subject/topic"
        }
    ],
    "summary": {
        "totalQuestions": 10,
        "totalMarks": 100,
        "subject": "detected subject",
        "difficulty": "easy/medium/hard"
    }
}

Rules:
1. Identify each distinct question
2. Clean the question text (remove question numbers, marks indicators)
3. Determine question type based on content
4. Estimate marks based on question complexity
5. For MCQs, extract options if present
6. For other types, leave options array empty`;

        console.log("Sending request to OpenAI...");
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert educational content analyzer. Extract and structure questions from text. Always return valid JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI API error:", response.status, errorText);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("OpenAI response received:", data);
        
        const aiResponse = data.choices[0].message.content;
        console.log("AI Response:", aiResponse);

        // Try to parse JSON response
        try {
            // Extract JSON from response (in case there's additional text)
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiData = JSON.parse(jsonMatch[0]);
                
                if (aiData.questions && aiData.questions.length > 0) {
                    // Process AI-extracted questions
                    extractedQuestions = aiData.questions.map((q, i) => ({
                        id: i + 1,
                        text: q.text || "Question text not extracted",
                        marks: q.marks || 5,
                        type: q.type || 'descriptive',
                        options: q.options || [],
                        correctAnswer: q.correctAnswer || 0,
                        category: q.category || 'General',
                        source: "AI Enhanced"
                    }));
                    
                    console.log(`AI extracted ${extractedQuestions.length} questions`);
                    
                    // Show success message
                    showAISuccessMessage(aiData.summary);
                    
                    // Go to step 3 after a delay
                    setTimeout(() => {
                        goToStep(3);
                    }, 2000);
                    
                } else {
                    throw new Error("No questions found in AI response");
                }
            } else {
                throw new Error("No JSON found in AI response");
            }
        } catch (e) {
            console.error("Error parsing AI response:", e);
            console.log("AI Response content:", aiResponse);
            
            // Try alternative parsing
            extractQuestionsFromAIText(aiResponse);
        }

    } catch (error) {
        console.error("AI Processing Error:", error);
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="background: #fee2e2; border: 2px solid #dc2626; border-radius: 10px; padding: 15px; margin-top: 20px;">
                <h4 style="color: #dc2626; margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> AI Processing Failed
                </h4>
                <p style="color: #7f1d1d;">Error: ${error.message}</p>
                <p style="color: #7f1d1d; margin-top: 10px;">Using basic extraction instead.</p>
            </div>
        `;
        
        document.getElementById('extractedTextPreview').appendChild(errorDiv);
        
        // Fall back to basic extraction
        setTimeout(() => {
            processExtractedText();
        }, 1000);
        
    } finally {
        // Restore button state
        aiProcessBtn.innerHTML = originalText;
        aiProcessBtn.disabled = false;
    }
}

function showAISuccessMessage(summary) {
    const aiResultDiv = document.createElement('div');
    aiResultDiv.innerHTML = `
        <div style="background: #d1fae5; border: 2px solid #10b981; border-radius: 10px; padding: 20px; margin-top: 20px;">
            <h4 style="color: #065f46; margin-bottom: 15px;">
                <i class="fas fa-check-circle"></i> AI Enhancement Complete!
            </h4>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #059669;">${summary?.totalQuestions || extractedQuestions.length}</div>
                    <div style="color: #047857; font-size: 0.9rem;">Questions</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #059669;">${summary?.totalMarks || extractedQuestions.reduce((s, q) => s + q.marks, 0)}</div>
                    <div style="color: #047857; font-size: 0.9rem;">Total Marks</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #059669;">${summary?.subject || 'General'}</div>
                    <div style="color: #047857; font-size: 0.9rem;">Subject</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #059669;">${summary?.difficulty || 'Medium'}</div>
                    <div style="color: #047857; font-size: 0.9rem;">Difficulty</div>
                </div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <h5 style="color: #065f46; margin-bottom: 10px;">What AI did:</h5>
                <ul style="color: #047857; padding-left: 20px;">
                    <li>Cleaned and formatted question text</li>
                    <li>Categorized questions by type</li>
                    <li>Estimated appropriate marks</li>
                    <li>Extracted MCQ options where available</li>
                </ul>
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    Continue to Edit Questions
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('extractedTextPreview').appendChild(aiResultDiv);
}

function extractQuestionsFromAIText(aiText) {
    console.log("Extracting questions from AI text...");
    
    // Split text into lines
    const lines = aiText.split('\n').filter(line => line.trim() !== '');
    extractedQuestions = [];
    let currentQuestion = null;
    let questionNumber = 1;

    // Common question patterns
    const questionPatterns = [
        /^Q\d+[:\.]/i,
        /^\d+[\.\)]/,
        /^Question\s+\d+/i,
        /^\([a-z]\)/i,
        /^[a-z]\./i
    ];

    lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Check if line looks like a question
        const isQuestion = questionPatterns.some(pattern => pattern.test(trimmedLine)) ||
                          (trimmedLine.length > 20 && 
                           !trimmedLine.includes('http') && 
                           !trimmedLine.includes('Options:') && 
                           !trimmedLine.includes('Answer:') &&
                           !trimmedLine.includes('Marks:'));

        if (isQuestion) {
            // Save previous question
            if (currentQuestion) {
                extractedQuestions.push(currentQuestion);
            }
            
            // Clean the question text
            let cleanText = trimmedLine
                .replace(/^Q\d+[:\.]\s*/i, '')
                .replace(/^\d+[\.\)]\s*/, '')
                .replace(/^Question\s+\d+[:\.\s]*/i, '')
                .replace(/^\([a-z]\)\s*/i, '')
                .replace(/^[a-z]\.\s*/i, '')
                .replace(/\s*\[.*?\]/g, '') // Remove [marks] indicators
                .replace(/\s*\(.*?\)/g, ''); // Remove (marks) indicators
            
            // Determine question type
            let type = "descriptive";
            const lowerText = cleanText.toLowerCase();
            
            if (lowerText.includes('choose') || lowerText.includes('select') || 
                lowerText.includes('multiple choice') || lowerText.includes('which of')) {
                type = "mcq";
            } else if (lowerText.includes('define') || lowerText.includes('state') || 
                      lowerText.includes('name') || lowerText.includes('list')) {
                type = "short";
            } else if (lowerText.includes('explain') || lowerText.includes('describe') || 
                      lowerText.includes('discuss') || lowerText.includes('analyze')) {
                type = "descriptive";
            } else if (lowerText.includes('essay') || lowerText.includes('write') || 
                      lowerText.includes('compose')) {
                type = "essay";
            }
            
            // Estimate marks based on question type
            let marks = 5;
            if (type === "short") marks = 3;
            if (type === "descriptive") marks = 8;
            if (type === "essay") marks = 15;
            
            currentQuestion = {
                id: questionNumber,
                text: cleanText,
                marks: marks,
                type: type,
                options: [],
                correctAnswer: 0,
                category: "AI Extracted",
                source: "AI"
            };
            
            questionNumber++;
        } else if (currentQuestion) {
            // Check for options (a), b), etc.)
            const optionMatch = trimmedLine.match(/^[a-d][\.\)]\s*(.+)/i);
            if (optionMatch && currentQuestion.type === "mcq") {
                currentQuestion.options.push(optionMatch[1].trim());
            }
            // Check for marks
            const marksMatch = trimmedLine.match(/(\d+)\s*(?:marks?|points?)/i);
            if (marksMatch) {
                currentQuestion.marks = parseInt(marksMatch[1]);
            }
        }
    });

    // Add the last question
    if (currentQuestion) {
        extractedQuestions.push(currentQuestion);
    }

    console.log(`Extracted ${extractedQuestions.length} questions from AI text`);
    
    if (extractedQuestions.length > 0) {
        showAISuccessMessage({
            totalQuestions: extractedQuestions.length,
            totalMarks: extractedQuestions.reduce((sum, q) => sum + q.marks, 0),
            subject: "General",
            difficulty: "Medium"
        });
        
        setTimeout(() => {
            goToStep(3);
        }, 2000);
    } else {
        alert("Could not extract questions from AI response. Using basic extraction.");
        processExtractedText();
    }
}

// Initialize Tesseract
async function initializeTesseract() {
    try {
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

            try {
                let fileText = "";

                // Handle PDF files
                if (file.type === 'application/pdf') {
                    progressText.textContent = `Converting PDF to images: ${file.name}...`;
                    fileText = await processPDF(file);
                } else {
                    // Handle image files
                    const imageUrl = URL.createObjectURL(file);

                    try {
                        progressText.textContent = `Running OCR on ${file.name}...`;
                        const { data: { text } } = await tesseractWorker.recognize(imageUrl);
                        fileText = text;
                    } finally {
                        URL.revokeObjectURL(imageUrl);
                    }
                }

                rawOCRText += `\n\n=== File: ${file.name} ===\n${fileText}`;
                console.log(`Extracted text from ${file.name}:`, fileText.substring(0, 200) + "...");

                // Update progress
                progressBar.style.width = Math.round(((i + 1) / uploadedFiles.length) * 100) + '%';
                progressText.textContent = `Completed ${i + 1} of ${uploadedFiles.length} files`;

            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                rawOCRText += `\n\n=== Error processing ${file.name} ===\n${error.message || 'Unknown error occurred'}`;
            }
        }

        // OCR Processing Complete
        progressText.textContent = 'OCR Processing Complete!';
        processingTitle.textContent = 'OCR Processing Complete!';

        // Show extracted text
        document.getElementById('rawText').textContent = rawOCRText || "No text was extracted.";
        document.getElementById('extractedTextPreview').classList.remove('hidden');

        // Enable AI button if API key exists
        if (openaiApiKey) {
            document.getElementById('aiProcessBtn').disabled = false;
        }

        // Enable next button
        document.getElementById('nextStep2Btn').disabled = false;

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

// PDF Processing
async function processPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = "";

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            // Convert canvas to blob and process with OCR
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imageUrl = URL.createObjectURL(imageBlob);

            try {
                const { data: { text } } = await tesseractWorker.recognize(imageUrl);
                extractedText += `\n\n=== PDF Page ${pageNum} ===\n${text}`;
                console.log(`Processed PDF page ${pageNum}`);
            } catch (error) {
                console.error(`Error processing PDF page ${pageNum}:`, error);
                extractedText += `\n\n=== Error on PDF Page ${pageNum} ===\n${error.message}`;
            } finally {
                URL.revokeObjectURL(imageUrl);
            }
        }

        return extractedText;
    } catch (error) {
        console.error("Error processing PDF:", error);
        throw new Error(`PDF processing failed: ${error.message}`);
    }
}

// Process extracted text into questions (Basic method)
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

    // Go to step 3
    goToStep(3);
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
    const lowerText = fullText.toLowerCase();
    
    if (lowerText.includes('choose') || lowerText.includes('select') || lowerText.includes('multiple choice')) {
        type = "mcq";
    } else if (lowerText.includes('explain') || lowerText.includes('describe') || lowerText.includes('discuss')) {
        type = "descriptive";
    } else if (lowerText.includes('define') || lowerText.includes('state') || lowerText.includes('name')) {
        type = "short";
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
        }
    }

    // Clean question text
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
        source: "Basic OCR"
    });
}

// Load questions in step 3
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
                        <span style="background: #e2e8f0; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; min-width: 40px; text-align: center;">
                            Q${questionNumber}
                        </span>
                        <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                            ${question.marks} marks
                        </span>
                        <span style="color: #64748b; font-size: 0.9rem; background: #f8fafc; padding: 4px 12px; border-radius: 20px; text-transform: capitalize;">
                            ${question.type}
                        </span>
                        ${question.source === "AI Enhanced" ? 
                            '<span style="color: #0ea5e9; font-size: 0.9rem; background: #f0f9ff; padding: 4px 12px; border-radius: 20px; font-weight: 600;"><i class="fas fa-robot"></i> AI</span>' : 
                            ''}
                    </div>
                    <div>
                        <button onclick="editQuestion(${question.id})" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px;">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteQuestion(${question.id})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
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
    document.getElementById('totalMarksDisplay').textContent = totalMarks;
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

// Optimize with AI function
async function optimizeWithAI() {
    if (!openaiApiKey) {
        alert("Please enter your OpenAI API key in Step 1 to use AI optimization.");
        goToStep(1);
        return;
    }

    if (extractedQuestions.length === 0) {
        alert("No questions to optimize. Please extract questions first.");
        return;
    }

    const optimizeBtn = document.getElementById('optimizeBtn');
    const originalText = optimizeBtn.innerHTML;
    optimizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Optimizing...';
    optimizeBtn.disabled = true;

    try {
        // Prepare questions for AI
        const questionsData = extractedQuestions.map((q, i) => ({
            number: i + 1,
            text: q.text,
            type: q.type,
            marks: q.marks,
            options: q.options
        }));

        const prompt = `You are an expert in educational content. Review these exam questions and provide specific suggestions for improvement:

${JSON.stringify(questionsData, null, 2)}

Please provide suggestions for:
1. Clarity improvements
2. Difficulty balancing
3. Marks distribution
4. Additional options for MCQs
5. Any ambiguities to fix

Provide specific, actionable suggestions for each question.`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert educational content reviewer. Provide specific, actionable suggestions for improving exam questions."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 1500
            })
        });

        const data = await response.json();
        const suggestions = data.choices[0].message.content;
        
        // Show suggestions in a modal
        showOptimizationModal(suggestions);

    } catch (error) {
        console.error("Optimization Error:", error);
        alert("AI optimization failed: " + error.message);
    } finally {
        optimizeBtn.innerHTML = '<i class="fas fa-robot"></i> Optimize with AI';
        optimizeBtn.disabled = false;
    }
}

function showOptimizationModal(suggestions) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: white; width: 90%; max-width: 800px; max-height: 80vh; border-radius: 15px; padding: 30px; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #1a202c;"><i class="fas fa-robot"></i> AI Optimization Suggestions</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">
                    ×
                </button>
            </div>
            
            <div style="white-space: pre-line; color: #4a5568; line-height: 1.6; padding: 20px; background: #f8fafc; border-radius: 10px; max-height: 50vh; overflow-y: auto;">
                ${suggestions}
            </div>
            
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn" onclick="this.parentElement.parentElement.parentElement.remove()">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Rest of the functions...
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
        averageScore: 0,
        processingMethod: openaiApiKey ? 'AI Enhanced' : 'Basic OCR'
    };

    // Save to localStorage
    allExams.push(exam);
    localStorage.setItem('ocrExams', JSON.stringify(allExams));

    // Show success message
    document.getElementById('step4Section').classList.add('hidden');
    document.getElementById('successMessage').classList.remove('hidden');

    document.getElementById('examLinkMessage').innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong style="font-size: 1.2rem;">${title}</strong><br>
            <div style="display: flex; gap: 15px; justify-content: center; margin: 15px 0;">
                <span>📝 ${exam.questions.length} Questions</span>
                <span>🏆 ${totalMarks} Marks</span>
                <span>🤖 ${exam.processingMethod}</span>
            </div>
        </div>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Share this link with students:</strong><br>
            <code style="background: white; padding: 10px; border-radius: 5px; display: inline-block; margin-top: 10px; word-break: break-all;">
                ${exam.shareLink}
            </code>
        </div>
        
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px;">
            <strong>Exam Code:</strong> 
            <span style="font-size: 1.2rem; font-weight: bold; color: #0ea5e9;">${exam.shortCode}</span><br>
            <small style="color: #64748b;">Students can use this code to quickly access the exam</small>
        </div>
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



function viewExamDashboard() {
    alert("Dashboard feature would show all created exams here.\n\nCreated Exams: " + allExams.length);
}