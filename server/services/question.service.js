function inferQuestionType(subject, questionText, options = []) {
  const text = [questionText, ...options].join(" ");
  const containsMathSymbols = [...text].some(char => /[=+×÷√∑∫^]/.test(char));
  return /math|algebra|geometry/i.test(subject) || containsMathSymbols ? "mathematical" : "general";
}

function normalizeQuestionType(questionType) {
  return questionType === "mathematical" ? "mathematical" : "general";
}

module.exports = { inferQuestionType, normalizeQuestionType };
