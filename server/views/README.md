# HTML views

The browser still uses the existing `/` and `/html/*.html` URLs. Express renders the matching EJS page from `pages/`, so existing links keep working while the source templates live outside the static asset directory.

Large pages are composed from focused partials:

- `partials/index/` contains the landing page, teacher workspace, student quiz dashboard, and quiz interface.
- `partials/student/` contains the dashboard, exam interface, and result summary.
- `partials/teacher/` contains the sidebar and each dashboard tab.
- `pages/` contains the route-level page templates, including the smaller standalone pages.

To add a section, create a partial under the matching feature folder and include it from that page with EJS `include`. Keep browser assets such as CSS and JavaScript under `public/`; the templates only assemble the page markup.
