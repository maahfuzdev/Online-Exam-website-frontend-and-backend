  // Global variables
    let currentTab = 'dashboard';
    let allStudents = [];
    let allExams = [];
    let allResults = [];
    let filteredResults = [];
    let currentPage = 1;
    const pageSize = 10;
    let sortColumn = 'date';
    let sortDirection = 'desc';
    let performanceChart, gradeChart, scoreChart, examChart;

    function subjectFromExamTitle(title) {
      const value = String(title || '').trim();
      const subject = value
        .replace(/[\s_:#-]*(?:(?:exam|quiz|test|assessment|midterm|final(?:[\s_-]*exam)?)[\s_:#-]*)?\d+$/i, '')
        .replace(/[\s_:#-]+(?:exam|quiz|test|assessment|midterm|final(?:[\s_-]*exam)?)$/i, '')
        .trim();
      return subject || '';
    }

    // Initialize the application
    async function init() {
      const teacherName = localStorage.getItem('userName');
      if (teacherName) document.getElementById('teacherName').textContent = teacherName;
      await loadAllData();
      setupCharts();
      renderAnalytics();
      const examDateInput = document.getElementById('examDate');
      if (examDateInput) examDateInput.valueAsDate = new Date();
    }

    // Tab switching
    function switchTab(tabName) {
      currentTab = tabName;
      const sectionDetails = {
        dashboard: ['OVERVIEW', 'Teacher dashboard', 'Monitor student performance and manage exams.'],
        results: ['ASSESSMENT', 'Student results', 'Review, filter, and export assessment results.'],
        exams: ['ASSESSMENT SETUP', 'Exam management', 'Create exams and review current assignments.'],
        analytics: ['INSIGHTS', 'Performance analytics', 'Explore score distributions and top performers.'],
        students: ['PEOPLE', 'Student management', 'Maintain student accounts and review progress.']
      };
      const [eyebrow, title, subtitle] = sectionDetails[tabName];
      document.getElementById('pageEyebrow').textContent = eyebrow;
      document.getElementById('pageTitle').textContent = title;
      document.getElementById('pageSubtitle').textContent = subtitle;

      // Update tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(tabName.charAt(0).toUpperCase() + tabName.slice(1))) {
          btn.classList.add('active');
        }
      });

      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
      });

      // Show selected tab
      document.getElementById(tabName + 'Tab').classList.remove('hidden');

      // Load data for tab
      switch (tabName) {
        case 'dashboard':
          renderDashboard();
          break;
        case 'results':
          loadResults();
          break;
        case 'exams':
          loadExams();
          break;
        case 'analytics':
          renderAnalytics();
          break;
        case 'students':
          loadStudentsList();
          break;
      }
    }

    async function loadAllData() {
      try {
        const teacherId = localStorage.getItem('userId');
        if (!teacherId) throw new Error('Please sign in as a teacher');

        const studentsResponse = await fetch('/assignments/api/students');
        if (!studentsResponse.ok) throw new Error('Failed to load students');
        allStudents = (await studentsResponse.json()).map(student => ({
          ...student,
          id: student._id,
          class: student.class || ''
        }));

        const examsResponse = await fetch(`/assignments/api/assigned-questions/teacher/${teacherId}`);
        if (!examsResponse.ok) throw new Error('Failed to load exams');
        allExams = (await examsResponse.json()).map(exam => ({
          id: exam._id,
          title: exam.examTitle,
          subject: exam.subject || subjectFromExamTitle(exam.examTitle),
          date: exam.startTime,
          totalMarks: exam.totalMarks,
          duration: exam.examTime,
          description: `${(exam.questionIds || []).length} questions`
        }));

        const resultsResponse = await fetch(`/results/api/teacherResults/${teacherId}`);
        if (!resultsResponse.ok) throw new Error('Failed to load results');
        allResults = (await resultsResponse.json()).map(result => {
          const linkedExam = allExams.find(exam => String(exam.id) === String(result.examId));
          return {
            ...result,
            subject: result.subject || linkedExam?.subject || subjectFromExamTitle(result.examTitle)
          };
        });

        renderStats();
        populateExamFilter();
        loadResults();
        loadExams();
        renderDashboard();
        renderAnalytics();
        loadStudentsList();
      } catch (error) {
        console.error('Error loading data:', error);
        allStudents = [];
        allExams = [];
        allResults = [];
        renderStats();
        populateExamFilter();
        loadResults();
        loadExams();
        renderAnalytics();
        loadStudentsList();
        document.getElementById('recentActivity').textContent = `Could not load dashboard data: ${error.message}`;
      }
    }

    // Render statistics
    function renderStats() {
      document.getElementById('totalStudents').textContent = allStudents.length;
      document.getElementById('totalExams').textContent = allExams.length;

      if (allResults.length > 0) {
        const avgPercentage = allResults.reduce((sum, result) => sum + result.percentage, 0) / allResults.length;
        document.getElementById('avgScore').textContent = avgPercentage.toFixed(1) + '%';
      } else {
        document.getElementById('avgScore').textContent = '0%';
      }

      const upcomingExams = allExams.filter(exam => {
        const examDate = new Date(exam.date);
        const today = new Date();
        return examDate >= today;
      });
      document.getElementById('pendingExams').textContent = upcomingExams.length;
    }

    // Setup charts
    function setupCharts() {
      const ctx1 = document.getElementById('performanceChart')?.getContext('2d');
      if (ctx1) {
        performanceChart = new Chart(ctx1, {
          type: 'line',
          data: {
            labels: (() => {
              const months = [];
              const currentMonth = new Date();
              currentMonth.setDate(1);
              for (let offset = 5; offset >= 0; offset--) {
                const month = new Date(currentMonth);
                month.setMonth(month.getMonth() - offset);
                months.push(month);
              }
              return months;
            })().map(month => month.toLocaleString(undefined, { month: 'short' })),
            datasets: [{
              label: 'Average Score %',
              data: (() => {
                const months = new Map();
                const currentMonth = new Date();
                currentMonth.setDate(1);
                for (let offset = 5; offset >= 0; offset--) {
                  const month = new Date(currentMonth);
                  month.setMonth(month.getMonth() - offset);
                  months.set(`${month.getFullYear()}-${month.getMonth()}`, []);
                }
                allResults.forEach(result => {
                  const date = new Date(result.date);
                  const values = months.get(`${date.getFullYear()}-${date.getMonth()}`);
                  if (values) values.push(Number(result.percentage) || 0);
                });
                return [...months.values()].map(values => values.length
                  ? values.reduce((sum, value) => sum + value, 0) / values.length
                  : 0);
              })(),
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    }

    // Render dashboard
    function renderDashboard() {
      // Update recent activity
      const activityHtml = allResults.slice(0, 5).map(result => `
        <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 15px;">
          <div style="width: 40px; height: 40px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ${result.studentName.charAt(0)}
          </div>
          <div>
            <div style="font-weight: 600; color: #2d3748;">${result.studentName}</div>
            <div style="color: #64748b; font-size: 0.9rem;">
              Scored ${result.score}/${result.total} (${result.percentage}%) in ${result.examTitle}
            </div>
          </div>
          <div style="margin-left: auto; color: #94a3b8; font-size: 0.85rem;">
            ${formatDate(result.date)}
          </div>
        </div>
      `).join('');

      document.getElementById('recentActivity').innerHTML = activityHtml ||
        '<p style="text-align: center; color: #64748b; font-style: italic;">No recent activity</p>';
    }

    // Load and render results
    function loadResults() {
      filteredResults = [...allResults];
      applyFilters();
      sortResults();
      renderResultsTable();
      updatePagination();
    }

    // Apply filters to results
    function applyFilters() {
      const subjectFilter = document.getElementById('filterSubject').value;
      const examFilter = document.getElementById('filterExam').value;
      const classFilter = document.getElementById('filterClass').value;
      const gradeFilter = document.getElementById('filterGrade').value;
      const searchFilter = document.getElementById('searchStudent').value.toLowerCase();

      filteredResults = allResults.filter(result => {
        const matchesSubject = !subjectFilter || (result.subject || '') === subjectFilter;
        const matchesExam = !examFilter || result.examId == examFilter;
        const matchesClass = !classFilter || result.class == classFilter;
        const matchesGrade = !gradeFilter || result.grade === gradeFilter;
        const matchesSearch = !searchFilter ||
          result.studentName.toLowerCase().includes(searchFilter) ||
          result.examTitle.toLowerCase().includes(searchFilter) ||
          (result.subject || '').toLowerCase().includes(searchFilter);

        return matchesSubject && matchesExam && matchesClass && matchesGrade && matchesSearch;
      });
    }

    // Sort results
    function sortResults() {
      filteredResults.sort((a, b) => {
        let aValue, bValue;

        switch (sortColumn) {
          case 'student':
            aValue = a.studentName;
            bValue = b.studentName;
            break;
          case 'exam':
            aValue = a.examTitle;
            bValue = b.examTitle;
            break;
          case 'subject':
            aValue = a.subject || '';
            bValue = b.subject || '';
            break;
          case 'score':
            aValue = a.percentage;
            bValue = b.percentage;
            break;
          case 'percentage':
            aValue = a.percentage;
            bValue = b.percentage;
            break;
          case 'grade':
            aValue = a.grade;
            bValue = b.grade;
            break;
          case 'date':
            aValue = new Date(a.date);
            bValue = new Date(b.date);
            break;
          default:
            aValue = a.date;
            bValue = b.date;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    // Render results table
    function renderResultsTable() {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageResults = filteredResults.slice(startIndex, endIndex);

      let html = '';

      if (pageResults.length === 0) {
        html = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
              No results found. Try changing your filters.
            </td>
          </tr>
        `;
      } else {
        pageResults.forEach(result => {
          const gradeClass = `grade-${result.grade.toLowerCase()}`;
          html += `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 36px; height: 36px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                    ${result.studentName.charAt(0)}
                  </div>
                  <div>
                    <div style="font-weight: 600;">${result.studentName}</div>
                    <div style="color: #64748b; font-size: 0.85rem;">Class ${result.class || 'N/A'}</div>
                  </div>
                </div>
              </td>
              <td>${result.subject || '—'}</td>
              <td>${result.examTitle}</td>
              <td>
                <div style="font-weight: 600; color: #1a202c;">${result.score}/${result.total}</div>
              </td>
              <td>
                <div style="font-weight: 600; color: #667eea;">${result.percentage}%</div>
              </td>
              <td>
                <span class="grade-badge ${gradeClass}">${result.grade}</span>
              </td>
              <td>${formatDate(result.date)}</td>
              <td>
                <button class="btn" style="padding: 6px 12px; font-size: 0.85rem;" onclick="viewStudentDetail(${JSON.stringify(String(result.studentId))})">
                  👁️ View
                </button>
              </td>
            </tr>
          `;
        });
      }

      document.getElementById('resultsBody').innerHTML = html;
    }

    // Sort table
    function sortTable(column) {
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'desc';
      }

      sortResults();
      renderResultsTable();

      // Update table header arrows
      document.querySelectorAll('th').forEach(th => {
        th.innerHTML = th.innerHTML.replace(' ▾', '').replace(' ▴', '');
        if (th.textContent.includes(column.charAt(0).toUpperCase() + column.slice(1))) {
          th.innerHTML += sortDirection === 'asc' ? ' ▴' : ' ▾';
        }
      });
    }

    // Filter results
    function filterResults() {
      currentPage = 1;
      loadResults();
    }

    // Update pagination
    function updatePagination() {
      const totalPages = Math.ceil(filteredResults.length / pageSize);
      const startIndex = (currentPage - 1) * pageSize + 1;
      const endIndex = Math.min(currentPage * pageSize, filteredResults.length);

      document.getElementById('startCount').textContent = startIndex;
      document.getElementById('endCount').textContent = endIndex;
      document.getElementById('totalCount').textContent = filteredResults.length;

      document.getElementById('prevBtn').disabled = currentPage === 1;
      document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
    }

    // Pagination functions
    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderResultsTable();
        updatePagination();
      }
    }

    function nextPage() {
      const totalPages = Math.ceil(filteredResults.length / pageSize);
      if (currentPage < totalPages) {
        currentPage++;
        renderResultsTable();
        updatePagination();
      }
    }

    // Populate exam filter
    function populateExamFilter() {
      const subjectSelect = document.getElementById('filterSubject');
      const examSelect = document.getElementById('filterExam');
      const selectedSubject = subjectSelect.value;
      const subjects = [...new Set(allExams.map(exam => exam.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      subjectSelect.innerHTML = '<option value="">All Subjects</option>';
      subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
      });
      subjectSelect.value = subjects.includes(selectedSubject) ? selectedSubject : '';

      examSelect.innerHTML = '<option value="">All Exams</option>';

      allExams.forEach(exam => {
        const option = document.createElement('option');
        option.value = exam.id;
        option.textContent = exam.subject ? `${exam.subject} · ${exam.title}` : exam.title;
        examSelect.appendChild(option);
      });
    }

    // Format date
    function formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    // Load exams
    function loadExams() {
      renderExams(allExams, 'teacherExamsList');
    }

    // Render exams
    function renderExams(exams, containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (exams.length === 0) {
        container.innerHTML = '<p style="color: #64748b; font-style: italic;">No assigned exams yet.</p>';
        return;
      }

      const html = exams.map(exam => `
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <h4 style="font-weight: 600; margin-bottom: 10px; color: #1a202c;">${exam.subject ? `<span style="display:inline-block;margin-right:6px;padding:3px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:11px;vertical-align:middle;">${exam.subject}</span>` : ''}${exam.title}</h4>
          <div style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">
            <div>${exam.description || 'No description provided'}</div>
          </div>
          <div style="color: #64748b; font-size: 0.9rem; margin-bottom: 15px;">
            <div>📅 Date: ${formatDate(exam.date)}</div>
            <div>⏱️ Duration: ${exam.duration} minutes</div>
            <div>📊 Total Marks: ${exam.totalMarks}</div>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn" style="padding: 8px 16px; font-size: 0.85rem; flex: 1;" onclick="viewExamResults(${JSON.stringify(String(exam.id))})">
              View Results
            </button>
          </div>
        </div>
      `).join('');

      container.innerHTML = html;
    }

    // Render analytics
    function renderAnalytics() {
      // Grade distribution
      const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      allResults.forEach(result => {
        if (gradeCounts[result.grade] !== undefined) {
          gradeCounts[result.grade]++;
        }
      });

      const gradeCtx = document.getElementById('gradeChart')?.getContext('2d');
      if (gradeCtx) {
        if (gradeChart) gradeChart.destroy();
        gradeChart = new Chart(gradeCtx, {
          type: 'doughnut',
          data: {
            labels: ['A', 'B', 'C', 'D', 'F'],
            datasets: [{
              data: [gradeCounts.A, gradeCounts.B, gradeCounts.C, gradeCounts.D, gradeCounts.F],
              backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#7c3aed']
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      }

      // Score distribution
      const scoreRanges = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '0-59': 0 };
      allResults.forEach(result => {
        const percentage = result.percentage;
        if (percentage >= 90) scoreRanges['90-100']++;
        else if (percentage >= 80) scoreRanges['80-89']++;
        else if (percentage >= 70) scoreRanges['70-79']++;
        else if (percentage >= 60) scoreRanges['60-69']++;
        else scoreRanges['0-59']++;
      });

      const scoreCtx = document.getElementById('scoreChart')?.getContext('2d');
      if (scoreCtx) {
        if (scoreChart) scoreChart.destroy();
        scoreChart = new Chart(scoreCtx, {
          type: 'bar',
          data: {
            labels: ['90-100%', '80-89%', '70-79%', '60-69%', '0-59%'],
            datasets: [{
              label: 'Number of Students',
              data: [scoreRanges['90-100'], scoreRanges['80-89'], scoreRanges['70-79'], scoreRanges['60-69'], scoreRanges['0-59']],
              backgroundColor: '#667eea'
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false }
            }
          }
        });
      }

      // Top performers
      const topPerformers = [...allResults]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 6);

      const performersHtml = topPerformers.map((result, index) => `
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div style="font-size: 1.5rem; font-weight: 800; color: #667eea;">#${index + 1}</div>
            <div style="width: 50px; height: 50px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
              ${result.studentName.charAt(0)}
            </div>
            <div>
              <div style="font-weight: 600;">${result.studentName}</div>
              <div style="color: #64748b; font-size: 0.9rem;">${result.examTitle}</div>
            </div>
          </div>
          <div style="text-align: center; padding: 10px; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 1.8rem; font-weight: 800; color: #10b981;">${result.percentage}%</div>
            <div style="color: #64748b; font-size: 0.9rem;">${result.score}/${result.total}</div>
          </div>
        </div>
      `).join('');

      document.getElementById('topPerformers').innerHTML = performersHtml;
    }

    // View student detail
    function viewStudentDetail(studentId) {
      const student = allStudents.find(s => s.id == studentId);
      const studentResults = allResults.filter(r => r.studentId == studentId);

      if (!student) return;

      const avgScore = studentResults.length > 0
        ? studentResults.reduce((sum, r) => sum + r.percentage, 0) / studentResults.length
        : 0;

      const highestScore = studentResults.length > 0
        ? Math.max(...studentResults.map(r => r.percentage))
        : 0;

      // Create modal
      const modalHtml = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
          <div style="background: white; border-radius: 20px; padding: 30px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
              <h2 style="font-size: 1.8rem; font-weight: 700; color: #1a202c;">Student Performance</h2>
              <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">×</button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
              <div style="width: 80px; height: 80px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 2rem;">
                ${student.name.charAt(0)}
              </div>
              <div>
                <h3 style="font-size: 1.5rem; font-weight: 700; color: #1a202c; margin-bottom: 5px;">${student.name}</h3>
                <div style="color: #64748b;">
                  <div>📧 ${student.email}</div>
                  <div>🎓 Class: ${student.class}</div>
                </div>
              </div>
            </div>
            
            <div class="performance-indicators">
              <div class="indicator">
                <div class="indicator-value">${studentResults.length}</div>
                <div class="indicator-label">Exams Taken</div>
              </div>
              <div class="indicator">
                <div class="indicator-value" style="color: #10b981;">${avgScore.toFixed(1)}%</div>
                <div class="indicator-label">Average Score</div>
              </div>
              <div class="indicator">
                <div class="indicator-value" style="color: #3b82f6;">${highestScore}%</div>
                <div class="indicator-label">Highest Score</div>
              </div>
              <div class="indicator">
                <div class="indicator-value" style="color: #667eea;">${getGradeFromPercentage(avgScore)}</div>
                <div class="indicator-label">Overall Grade</div>
              </div>
            </div>
            
            <h4 style="font-weight: 600; margin: 30px 0 15px; color: #1a202c;">📋 Exam History</h4>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 12px; text-align: left;">Exam</th>
                    <th style="padding: 12px; text-align: left;">Date</th>
                    <th style="padding: 12px; text-align: left;">Score</th>
                    <th style="padding: 12px; text-align: left;">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentResults.map(result => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 12px;">${result.examTitle}</td>
                      <td style="padding: 12px;">${formatDate(result.date)}</td>
                      <td style="padding: 12px; font-weight: 600;">${result.score}/${result.total} (${result.percentage}%)</td>
                      <td style="padding: 12px;"><span class="grade-badge grade-${result.grade.toLowerCase()}">${result.grade}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div style="margin-top: 30px; display: flex; gap: 15px;">
              <button class="btn btn-primary" onclick="generateReport(${JSON.stringify(String(studentId))})">📄 Generate Report</button>
              <button class="btn" onclick="closeModal()">Close</button>
            </div>
          </div>
        </div>
      `;

      // Add modal to document
      const modalDiv = document.createElement('div');
      modalDiv.innerHTML = modalHtml;
      modalDiv.id = 'studentDetailModal';
      document.body.appendChild(modalDiv);
    }

    // Close modal
    function closeModal() {
      const modal = document.getElementById('studentDetailModal');
      if (modal) modal.remove();
    }

    // Get grade from percentage
    function getGradeFromPercentage(percentage) {
      if (percentage >= 90) return 'A';
      if (percentage >= 80) return 'B';
      if (percentage >= 70) return 'C';
      if (percentage >= 60) return 'D';
      return 'F';
    }

    // Export functions
    function exportToPDF(results = filteredResults, fileName = 'student-results.pdf') {
      const PDFDocument = window.jspdf?.jsPDF;
      if (!PDFDocument) return alert('PDF export library is unavailable');

      const document = new PDFDocument();
      document.text('Student Results', 14, 16);
      let y = 28;
      results.forEach(result => {
        const line = `${result.studentName} | ${result.subject || 'Subject not set'} | ${result.examTitle} | ${result.score}/${result.total} | ${result.percentage}% | ${result.grade} | ${formatDate(result.date)}`;
        const wrappedLines = document.splitTextToSize(line, 180);
        if (y + wrappedLines.length * 7 > 280) {
          document.addPage();
          y = 18;
        }
        document.text(wrappedLines, 14, y);
        y += wrappedLines.length * 7;
      });
      document.save(fileName);
    }

    function exportToExcel() {
      const columns = ['Student', 'Class', 'Subject', 'Exam', 'Score', 'Total', 'Percentage', 'Grade', 'Date'];
      const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const rows = filteredResults.map(result => [
        result.studentName,
        result.class,
        result.subject,
        result.examTitle,
        result.score,
        result.total,
        `${result.percentage}%`,
        result.grade,
        formatDate(result.date)
      ]);
      const csv = [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student-results.csv';
      link.click();
      URL.revokeObjectURL(url);
    }

    function printResults() {
      window.print();
    }

    function viewExamResults(examId) {
      const exam = allExams.find(e => e.id == examId);
      if (exam) {
        // Filter results for this exam
        document.getElementById('filterExam').value = examId;
        filterResults();
        switchTab('results');
      }
    }

    // Student management functions
    async function addStudent() {
      const name = document.getElementById('studentName').value.trim();
      const email = document.getElementById('studentEmail').value.trim();
      const password = document.getElementById('studentPassword').value;
      const studentClass = document.getElementById('studentClass').value;

      if (!name || !email || !studentClass || password.length < 6) {
        alert('Enter the student name, email, class, and a password of at least 6 characters.');
        return;
      }

      try {
        const response = await fetch('/assignments/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, class: studentClass })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not create student');

        clearStudentForm();
        await loadAllData();
        switchTab('students');
        alert('Student account created. Share the initial password securely with the student.');
      } catch (error) {
        alert(error.message);
      }
    }

    function clearStudentForm() {
      document.getElementById('studentName').value = '';
      document.getElementById('studentEmail').value = '';
      document.getElementById('studentPassword').value = '';
      document.getElementById('studentClass').value = '';
      document.getElementById('studentPassword').required = true;
      document.getElementById('studentPassword').placeholder = 'At least 6 characters';
      const submitButton = document.getElementById('studentSubmitButton');
      submitButton.textContent = '👤 Add Student';
      submitButton.onclick = addStudent;
    }

    function loadStudentsList() {
      const studentsList = document.getElementById('studentsList');
      
      if (allStudents.length === 0) {
        studentsList.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
              No students found. Add your first student above.
            </td>
          </tr>
        `;
        return;
      }

      const html = allStudents.map(student => {
        const studentResults = allResults.filter(r => r.studentId == student.id);
        const avgScore = studentResults.length > 0
          ? (studentResults.reduce((sum, r) => sum + r.percentage, 0) / studentResults.length).toFixed(1)
          : 'N/A';

        return `
          <tr>
            <td>${student.id}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                  ${student.name.charAt(0)}
                </div>
                <div>${student.name}</div>
              </div>
            </td>
            <td>${student.email}</td>
            <td>Class ${student.class}</td>
            <td>${studentResults.length}</td>
            <td>
              <div style="font-weight: 600; color: ${avgScore === 'N/A' ? '#64748b' : (avgScore >= 70 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444')}">
                ${avgScore === 'N/A' ? 'N/A' : avgScore + '%'}
              </div>
            </td>
            <td>
              <button class="btn" style="padding: 6px 12px; font-size: 0.85rem;" onclick="viewStudentDetail(${JSON.stringify(String(student.id))})">
                👁️ View
              </button>
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="editStudent(${JSON.stringify(String(student.id))})">
                ✏️ Edit
              </button>
            </td>
          </tr>
        `;
      }).join('');

      studentsList.innerHTML = html;
    }

    function editStudent(studentId) {
      const student = allStudents.find(s => s.id == studentId);
      if (!student) return;

      // Fill form with student data
      document.getElementById('studentName').value = student.name;
      document.getElementById('studentEmail').value = student.email;
      document.getElementById('studentClass').value = student.class || '';
      const passwordInput = document.getElementById('studentPassword');
      passwordInput.value = '';
      passwordInput.required = false;
      passwordInput.placeholder = 'Leave blank to keep current password';

      // Change button to update
      const addBtn = document.getElementById('studentSubmitButton');
      addBtn.textContent = '✏️ Update Student';
      addBtn.onclick = function() { updateStudent(studentId); };

      // Scroll to form
      switchTab('students');
      document.getElementById('studentsTab').scrollIntoView();
    }

    async function updateStudent(studentId) {
      const name = document.getElementById('studentName').value.trim();
      const email = document.getElementById('studentEmail').value.trim();
      const studentClass = document.getElementById('studentClass').value;

      if (!name || !email || !studentClass) {
        alert('Please fill in all required fields');
        return;
      }

      try {
        const response = await fetch(`/assignments/api/students/${encodeURIComponent(studentId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, class: studentClass })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not update student');

        clearStudentForm();
        await loadAllData();
        switchTab('students');
      } catch (error) {
        alert(error.message);
      }
    }

    function generateReport(studentId) {
      const student = allStudents.find(item => String(item.id) === String(studentId));
      if (!student) return alert('Student not found');
      const results = allResults.filter(result => String(result.studentId) === String(studentId));
      const fileName = `${student.name.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.pdf`;
      exportToPDF(results, fileName);
    }

    function showLandingPage() {
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('userId');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        localStorage.removeItem('teacherId');
        localStorage.removeItem('showteacher');
        window.location.href = '/'; // Redirect to login page
      }
    }

    // Initialize app
    window.addEventListener('load', function () {
      init();
    });

    // Add event listeners for closing modal with ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
