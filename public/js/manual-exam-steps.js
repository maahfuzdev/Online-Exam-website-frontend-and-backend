    function showExamStep(step) {
      document.querySelectorAll('.exam-step-panel').forEach(panel => panel.classList.add('hidden'));
      document.getElementById(`examStep${step}`).classList.remove('hidden');
      document.querySelectorAll('.exam-step').forEach(button => {
        const buttonStep = Number(button.dataset.examStep);
        button.classList.toggle('active', buttonStep === step);
        button.classList.toggle('completed', buttonStep < step);
        if (buttonStep === step) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      document.querySelectorAll('.exam-step-connector').forEach((connector, index) => {
        connector.classList.toggle('completed', index + 1 < step);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
