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

    // Initialize the application
    function init() {
      loadAllData();
      setupCharts();
      renderStats();
      // Set today's date as default for exam form
      document.getElementById('examDate').valueAsDate = new Date();
    }

    // Tab switching
    function switchTab(tabName) {
      currentTab = tabName;

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

    // Load all data
    async function loadAllData() {
      try {
        const teacherId = localStorage.getItem('userId') || '1';

        // Load students
        const studentsResponse = await fetch(`http://localhost:3000/assignments/api/students`);
        allStudents = await studentsResponse.json();

        // Load exams
        const examsResponse = await fetch(`http://localhost:3000/api/exams/${teacherId}`);
        allExams = await examsResponse.json();

        // Load results
        const resultsResponse = await fetch(`http://localhost:3000/api/results/${teacherId}`);
        allResults = await resultsResponse.json();

        renderStats();
        populateExamFilter();
        loadResults();
        loadExams();
        renderDashboard();
        renderAnalytics();
        loadStudentsList();

      } catch (error) {
        console.error('Error loading data:', error);
        // Load sample data for demo
        loadSampleData();
      }
    }

    // Load sample data for demo
    function loadSampleData() {
      // allStudents = [
      //   { id: 1, name: 'John Smith', class: '10', email: 'john@example.com' },
      //   { id: 2, name: 'Emma Johnson', class: '11', email: 'emma@example.com' },
      //   { id: 3, name: 'Michael Brown', class: '12', email: 'michael@example.com' },
      //   { id: 4, name: 'Sarah Davis', class: '10', email: 'sarah@example.com' },
      //   { id: 5, name: 'David Wilson', class: '11', email: 'david@example.com' },
      //   { id: 6, name: 'Lisa Miller', class: '12', email: 'lisa@example.com' },
      //   { id: 7, name: 'Robert Taylor', class: '10', email: 'robert@example.com' },
      //   { id: 8, name: 'Jennifer Anderson', class: '11', email: 'jennifer@example.com' }
      // ];
      
      allExams = [
        { id: 1, title: 'Mid Term Exam - Math', date: '2024-03-15', totalMarks: 100, duration: 120, description: 'Mathematics mid-term examination covering algebra and geometry' },
        { id: 2, title: 'Final Exam - Science', date: '2024-03-20', totalMarks: 100, duration: 90, description: 'Comprehensive science exam covering physics, chemistry, and biology' },
        { id: 3, title: 'Quiz - Physics', date: '2024-03-25', totalMarks: 50, duration: 60, description: 'Short quiz on Newtonian physics concepts' },
        { id: 4, title: 'Chemistry Test', date: '2024-04-01', totalMarks: 100, duration: 120, description: 'Test on chemical equations and periodic table' }
      ];

      allResults = [
        { id: 1, studentId: 1, studentName: 'John Smith', class: '10', examId: 1, examTitle: 'Mid Term Exam - Math', score: 85, total: 100, percentage: 85, grade: 'A', date: '2024-03-15' },
        { id: 2, studentId: 2, studentName: 'Emma Johnson', class: '11', examId: 1, examTitle: 'Mid Term Exam - Math', score: 92, total: 100, percentage: 92, grade: 'A', date: '2024-03-15' },
        { id: 3, studentId: 3, studentName: 'Michael Brown', class: '12', examId: 1, examTitle: 'Mid Term Exam - Math', score: 78, total: 100, percentage: 78, grade: 'B', date: '2024-03-15' },
        { id: 4, studentId: 4, studentName: 'Sarah Davis', class: '10', examId: 1, examTitle: 'Mid Term Exam - Math', score: 65, total: 100, percentage: 65, grade: 'C', date: '2024-03-15' },
        { id: 5, studentId: 5, studentName: 'David Wilson', class: '11', examId: 2, examTitle: 'Final Exam - Science', score: 88, total: 100, percentage: 88, grade: 'A', date: '2024-03-20' },
        { id: 6, studentId: 6, studentName: 'Lisa Miller', class: '12', examId: 2, examTitle: 'Final Exam - Science', score: 95, total: 100, percentage: 95, grade: 'A', date: '2024-03-20' },
        { id: 7, studentId: 7, studentName: 'Robert Taylor', class: '10', examId: 3, examTitle: 'Quiz - Physics', score: 42, total: 50, percentage: 84, grade: 'A', date: '2024-03-25' },
        { id: 8, studentId: 1, studentName: 'John Smith', class: '10', examId: 2, examTitle: 'Final Exam - Science', score: 76, total: 100, percentage: 76, grade: 'B', date: '2024-03-20' }
      ];

      renderStats();
      populateExamFilter();
      loadResults();
      loadExams();
      renderDashboard();
      renderAnalytics();
      loadStudentsList();
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
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Average Score %',
              data: [65, 72, 78, 82, 85, 88],
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
      const examFilter = document.getElementById('filterExam').value;
      const classFilter = document.getElementById('filterClass').value;
      const gradeFilter = document.getElementById('filterGrade').value;
      const searchFilter = document.getElementById('searchStudent').value.toLowerCase();

      filteredResults = allResults.filter(result => {
        const matchesExam = !examFilter || result.examId == examFilter;
        const matchesClass = !classFilter || result.class == classFilter;
        const matchesGrade = !gradeFilter || result.grade === gradeFilter;
        const matchesSearch = !searchFilter ||
          result.studentName.toLowerCase().includes(searchFilter) ||
          result.examTitle.toLowerCase().includes(searchFilter);

        return matchesExam && matchesClass && matchesGrade && matchesSearch;
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
            <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
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
                <button class="btn" style="padding: 6px 12px; font-size: 0.85rem;" onclick="viewStudentDetail(${result.studentId})">
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
      const examSelect = document.getElementById('filterExam');
      examSelect.innerHTML = '<option value="">All Exams</option>';

      allExams.forEach(exam => {
        const option = document.createElement('option');
        option.value = exam.id;
        option.textContent = exam.title;
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingExams = allExams.filter(exam => {
        const examDate = new Date(exam.date);
        examDate.setHours(0, 0, 0, 0);
        return examDate >= today;
      });

      const pastExams = allExams.filter(exam => {
        const examDate = new Date(exam.date);
        examDate.setHours(0, 0, 0, 0);
        return examDate < today;
      });

      renderExams(upcomingExams, 'upcomingExams');
      renderExams(pastExams, 'pastExams');
    }

    // Render exams
    function renderExams(exams, containerId) {
      const container = document.getElementById(containerId);

      if (exams.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b; font-style: italic;">No exams found</p>';
        return;
      }

      const html = exams.map(exam => `
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          <h4 style="font-weight: 600; margin-bottom: 10px; color: #1a202c;">${exam.title}</h4>
          <div style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">
            <div>${exam.description || 'No description provided'}</div>
          </div>
          <div style="color: #64748b; font-size: 0.9rem; margin-bottom: 15px;">
            <div>📅 Date: ${formatDate(exam.date)}</div>
            <div>⏱️ Duration: ${exam.duration} minutes</div>
            <div>📊 Total Marks: ${exam.totalMarks}</div>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn" style="padding: 8px 16px; font-size: 0.85rem; flex: 1;" onclick="viewExamResults(${exam.id})">
              View Results
            </button>
            <button class="btn btn-primary" style="padding: 8px 16px; font-size: 0.85rem;" onclick="editExam(${exam.id})">
              Edit
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
              <button class="btn btn-primary" onclick="generateReport(${studentId})">📄 Generate Report</button>
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
    function exportToPDF() {
      alert('PDF export feature would be implemented here');
      // Implementation for PDF export
    }

    function exportToExcel() {
      alert('Excel export feature would be implemented here');
      // Implementation for Excel export
    }

    function printResults() {
      window.print();
    }

    // Exam management functions
    function createExam() {
      const title = document.getElementById('examTitle').value;
      const date = document.getElementById('examDate').value;
      const duration = document.getElementById('examDuration').value;
      const marks = document.getElementById('examMarks').value;
      const description = document.getElementById('examDescription').value;

      if (!title || !date || !duration || !marks) {
        alert('Please fill in all required fields');
        return;
      }

      const newExam = {
        id: allExams.length + 1,
        title: title,
        date: date,
        duration: parseInt(duration),
        totalMarks: parseInt(marks),
        description: description
      };

      allExams.push(newExam);
      alert('Exam created successfully!');
      clearExamForm();
      loadExams();
      populateExamFilter();
      renderStats();
      switchTab('exams');
    }

    function clearExamForm() {
      document.getElementById('examTitle').value = '';
      document.getElementById('examDate').valueAsDate = new Date();
      document.getElementById('examDuration').value = '';
      document.getElementById('examMarks').value = '';
      document.getElementById('examDescription').value = '';
    }

    function editExam(examId) {
      const exam = allExams.find(e => e.id == examId);
      if (!exam) return;

      // Fill form with exam data
      document.getElementById('examTitle').value = exam.title;
      document.getElementById('examDate').value = exam.date;
      document.getElementById('examDuration').value = exam.duration;
      document.getElementById('examMarks').value = exam.totalMarks;
      document.getElementById('examDescription').value = exam.description || '';

      // Change button to update
      const createBtn = document.querySelector('.btn-teacher');
      createBtn.textContent = '📝 Update Exam';
      createBtn.onclick = function() { updateExam(examId); };

      // Scroll to form
      document.getElementById('examFormSection').scrollIntoView();
      switchTab('exams');
    }

    function updateExam(examId) {
      const title = document.getElementById('examTitle').value;
      const date = document.getElementById('examDate').value;
      const duration = document.getElementById('examDuration').value;
      const marks = document.getElementById('examMarks').value;
      const description = document.getElementById('examDescription').value;

      if (!title || !date || !duration || !marks) {
        alert('Please fill in all required fields');
        return;
      }

      const examIndex = allExams.findIndex(e => e.id == examId);
      if (examIndex !== -1) {
        allExams[examIndex] = {
          ...allExams[examIndex],
          title: title,
          date: date,
          duration: parseInt(duration),
          totalMarks: parseInt(marks),
          description: description
        };

        alert('Exam updated successfully!');
        clearExamForm();
        loadExams();
        populateExamFilter();
        switchTab('exams');

        // Reset button
        const createBtn = document.querySelector('.btn-teacher');
        createBtn.textContent = '📝 Create Exam';
        createBtn.onclick = createExam;
      }
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
    function addStudent() {
      const name = document.getElementById('studentName').value;
      const email = document.getElementById('studentEmail').value;
      const studentClass = document.getElementById('studentClass').value;

      if (!name || !email || !studentClass) {
        alert('Please fill in all required fields');
        return;
      }

      const newStudent = {
        id: allStudents.length + 1,
        name: name,
        email: email,
        class: studentClass
      };

      allStudents.push(newStudent);
      alert('Student added successfully!');
      clearStudentForm();
      loadStudentsList();
      renderStats();
      switchTab('students');
    }

    function clearStudentForm() {
      document.getElementById('studentName').value = '';
      document.getElementById('studentEmail').value = '';
      document.getElementById('studentClass').value = '';
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
              <button class="btn" style="padding: 6px 12px; font-size: 0.85rem;" onclick="viewStudentDetail(${student.id})">
                👁️ View
              </button>
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="editStudent(${student.id})">
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
      document.getElementById('studentClass').value = student.class;

      // Change button to update
      const addBtn = document.querySelector('.btn-teacher');
      addBtn.textContent = '✏️ Update Student';
      addBtn.onclick = function() { updateStudent(studentId); };

      // Scroll to form
      document.getElementById('examFormSection').scrollIntoView();
      switchTab('students');
    }

    function updateStudent(studentId) {
      const name = document.getElementById('studentName').value;
      const email = document.getElementById('studentEmail').value;
      const studentClass = document.getElementById('studentClass').value;

      if (!name || !email || !studentClass) {
        alert('Please fill in all required fields');
        return;
      }

      const studentIndex = allStudents.findIndex(s => s.id == studentId);
      if (studentIndex !== -1) {
        allStudents[studentIndex] = {
          ...allStudents[studentIndex],
          name: name,
          email: email,
          class: studentClass
        };

        // Update student name in results
        allResults.forEach(result => {
          if (result.studentId == studentId) {
            result.studentName = name;
            result.class = studentClass;
          }
        });

        alert('Student updated successfully!');
        clearStudentForm();
        loadStudentsList();
        loadResults();

        // Reset button
        const addBtn = document.querySelector('.btn-teacher');
        addBtn.textContent = '👤 Add Student';
        addBtn.onclick = addStudent;
      }
    }

    function generateReport(studentId) {
      alert(`Generate report for student ${studentId} - This feature would generate a detailed PDF report`);
    }

    function showLandingPage() {
      // In a real app, this would log out the teacher
      if (confirm('Are you sure you want to logout?')) {
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