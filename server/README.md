# Backend structure

The backend follows a feature-oriented Express/Mongoose layout:

```text
server/
├── app.js                 Express configuration and page rendering
├── server.js              Process startup
├── config/                Environment-dependent setup, including MongoDB
├── routes/                HTTP method and URL to controller mapping
├── controllers/           Request/response handling
├── services/              Business rules and external provider workflows
├── repositories/          Mongoose data access
├── models/                Mongoose schemas and models
├── middleware/            Shared Express middleware
└── views/                 EJS pages and reusable HTML partials
```

For example, a question request enters through `routes/question.routes.js`, is handled by `controllers/question.controller.js`, uses a question service when it needs business logic, and reads or writes through a repository backed by `models/Question.js`.

The root files `authentication.js`, `question.js`, `Results.js`, `AssignedQuestions.js`, and `Submissions.js` are compatibility exports. New routes and controller code belong in their matching folders.

Start the backend from `server/` with `npm start`. The existing API URL prefixes and page URLs are registered by the route registry and `app.js`.

Authentication uses server-side sessions stored in MongoDB. Set `SESSION_SECRET` to a long, random value in the deployment environment so sessions remain valid across server restarts. The browser session cookie is HTTP-only, secure in production, and expires after eight hours.
