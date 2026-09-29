    // Initialize app
window.addEventListener('load', function () {
  const showstudent = localStorage.getItem('showstudent');
  const showteacher= localStorage.getItem('showteacher');
    if (showstudent === 'true') {
      this.window.location.href = "/html/index.html"; // ✅ এই ফাংশন already hideAllSections() + remove('hidden') handle করে
        localStorage.removeItem('showstudent'); // reset
    } else if (showteacher === 'true') {
      showTeacherDashboard();

        localStorage.removeItem('showteacher'); // reset
    } else {
        showLandingPage(); // landing page দেখানোর জন্য
    }

    init(); // app initialize
});
