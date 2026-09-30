    // Initialize app
window.addEventListener('load', function () {
  const showstudent = localStorage.getItem('showstudent');
  const showteacher= localStorage.getItem('showteacher');
    if (showstudent === 'true') {
      localStorage.removeItem('showstudent');
      window.location.replace('/student/dashboard');
      return;
    } else if (showteacher === 'true') {
      localStorage.removeItem('showteacher');
      window.location.replace('/teacher/dashboard');
      return;
    }

    showLandingPage();
    init();
});
