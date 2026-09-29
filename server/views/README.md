# HTML views

Use clean, role-based URLs in the browser: `/` for the app, `/login` for sign-in and registration, `/teacher/dashboard` and `/student/dashboard` for the dashboards, `/teacher/questions/ocr` for OCR question creation, and `/teacher/exams/:examId/results` for an exam's results. Express renders the matching EJS page from `pages/`; the URL does not need to match the template filename.

The older `/html/*.html` URLs and `/studentsLogReg` remain as compatibility routes for bookmarks and external links. New links in the app should use the clean routes above.

Large pages are composed from focused partials:

- `partials/index/` contains the landing page, teacher workspace, student quiz dashboard, and quiz interface.
- `partials/student/` contains the dashboard, exam interface, and result summary.
- `partials/teacher/` contains the sidebar and each dashboard tab.
- `pages/` contains the route-level page templates, including the smaller standalone pages.

To add a section, create a partial under the matching feature folder and include it from that page with EJS `include`. Keep browser assets such as CSS and JavaScript under `public/`; the templates only assemble the page markup.
