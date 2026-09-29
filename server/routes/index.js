const express = require("express");

const router = express.Router();
const { router: authenticationRouter } = require("./auth.routes");
const { router: questionRouter } = require("./question.routes");
const { router: resultRouter } = require("./result.routes");
const { router: submissionRouter } = require("./submissions.routes");
const { router: assignmentRouter } = require("./assignment.routes");

router.use("/authentication", authenticationRouter);
router.use("/", questionRouter);
router.use("/results", resultRouter);
router.use("/submissions", submissionRouter);
router.use("/assignments", assignmentRouter);

module.exports = router;
