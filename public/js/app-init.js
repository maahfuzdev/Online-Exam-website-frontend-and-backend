    // Initialize app
document.addEventListener('DOMContentLoaded', function () {
  const showstudent = localStorage.getItem('showstudent');
  const showteacher= localStorage.getItem('showteacher');
    if (showstudent === 'true') {
      localStorage.removeItem('showstudent');
      window.location.replace('/student/dashboard');
      return;
    } else if (showteacher === 'true') {
      localStorage.removeItem('showteacher');
      // The legacy question/exam workspace is rendered on the home page.
      // Keep that workspace here so its saved step/mode state is not lost to
      // a redirect into the standalone teacher dashboard.
      showTeacherDashboard();
      init();
      return;
    }

    showLandingPage();
    init();
});
