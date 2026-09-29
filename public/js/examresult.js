    // Get examId from URL
    function getExamIdFromURL() {
      const urlParams = new URLSearchParams(window.location.search);
      const routeMatch = window.location.pathname.match(/^\/teacher\/exams\/([^/]+)\/results\/?$/);
      return (routeMatch ? decodeURIComponent(routeMatch[1]) : null) || urlParams.get('examId');
    }

    // Navigate back to exams page
    function goBack() {
      window.history.back();
    }

    // Get grade based on percentage
    function getGrade(percentage) {
      if (percentage >= 80) return 'A+';
      if (percentage >= 70) return 'A';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C';
      if (percentage >= 40) return 'D';
      return 'F';
    }

    // Get grade CSS class
    function getGradeClass(percentage) {
      if (percentage >= 80) return 'grade-a-plus';
      if (percentage >= 70) return 'grade-a';
      if (percentage >= 60) return 'grade-b';
      if (percentage >= 50) return 'grade-c';
      if (percentage >= 40) return 'grade-d';
      return 'grade-f';
    }

    // Get rank display (medal or number)
    function getRankDisplay(rank) {
      if (rank === 1) return '<span class="rank-medal"></span>';
      if (rank === 2) return '<span class="rank-medal">ˆ</span>';
      if (rank === 3) return '<span class="rank-medal"></span>';
      return `<span class="rank-cell">${rank}</span>`;
    }

    // Get rank CSS class
    function getRankClass(rank) {
      if (rank === 1) return 'rank-1';
      if (rank === 2) return 'rank-2';
      if (rank === 3) return 'rank-3';
      return '';
    }

    // Display error message
    function showError(message) {
      const errorDiv = document.getElementById('errorMessage');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    // Display results in table
    function displayResults(results) {
      const tbody = document.getElementById('resultsTableBody');
      tbody.innerHTML = '';

      if (!results || results.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="no-results">
              No students have taken this exam yet
            </td>
          </tr>
        `;
        return;
      }

      // Sort results by percentage (highest first)
      const sortedResults = [...results].sort((a, b) => {
        // First sort by percentage
        if (b.percentage !== a.percentage) {
          return b.percentage - a.percentage;
        }
        // If percentage is same, sort by score
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If score is also same, sort by time taken (less time = better)
        return a.timeTaken - b.timeTaken;
      });

      // Calculate average percentage
      const avgPercentage = (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(2);
      document.getElementById('avgScore').textContent = `${avgPercentage}%`;

      // Update exam info
      const firstResult = results[0];
      document.getElementById('resultExamTitle').textContent = firstResult.examTitle || 'Exam Results';
      document.getElementById('examStudents').textContent = `${results.length} Students`;
      document.getElementById('examQuestions').textContent = `${firstResult.totalQuestions || '-'} Questions`;

      // Render each result row with ranking
      sortedResults.forEach((result, index) => {
        const rank = index + 1;
        const grade = getGrade(result.percentage);
        const gradeClass = getGradeClass(result.percentage);
        const rankDisplay = getRankDisplay(rank);
        const rankClass = getRankClass(rank);

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="rank-cell ${rankClass}">
            ${rankDisplay}
          </td>
          <td>
            <div class="student-info">
              <div class="student-avatar">
                ${result.studentID.name.charAt(0).toUpperCase()}
              </div>
              <div class="student-name">${result.studentID.name}</div>
            </div>
          </td>
          <td><strong>${result.score}/${result.totalMarks}</strong></td>
          <td>
            <span class="score-badge ${gradeClass}">
              ${result.percentage.toFixed(2)}%
            </span>
          </td>
          <td>
            <span class="score-badge ${gradeClass}">${grade}</span>
          </td>
          <td>
            <span class="answer-stat stat-correct">
              ✓ ${result.correctAnswers}
            </span>
          </td>
          <td>
            <span class="answer-stat stat-wrong">
              ✗ ${result.wrongAnswers}
            </span>
          </td>
          <td>
            <span class="answer-stat stat-skipped">
              − ${result.skippedQuestion}
            </span>
          </td>
          <td>${result.timeTaken}s</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Load exam results from API
    async function loadExamResults() {
      const examId = getExamIdFromURL();
      console.log("examid from url", examId);

      if (!examId) {
        showError('No exam ID provided in URL');
        document.getElementById('resultsTableBody').innerHTML = `
          <tr>
            <td colspan="9" class="no-results">
              Invalid exam ID. Please go back and select an exam.
            </td>
          </tr>
        `;
        return;
      }

      try {
        // Fetch results from API
        const response = await fetch(`/results/api/studentsResultbyExamID/${examId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const examResults = data;
        console.log("result", examResults);

        // Display results
        displayResults(examResults);

      } catch (error) {
        console.error('Error loading exam results:', error);
        showError('Failed to load exam results. Please try again later.');

        document.getElementById('resultsTableBody').innerHTML = `
          <tr>
            <td colspan="9" class="no-results">
              Error loading results. Please try again.
            </td>
          </tr>
        `;
      }
    }

    // Load results when page loads
    window.addEventListener('DOMContentLoaded', loadExamResults);
