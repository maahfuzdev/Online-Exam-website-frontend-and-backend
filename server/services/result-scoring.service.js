function scoreExamAnswers(questions, answers, exam) {
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const answerReview = questions.map((question, index) => {
    const rawAnswer = answers[index];
    const selectedOption = rawAnswer === undefined || rawAnswer === null || rawAnswer === "" ? null : Number(rawAnswer);
    const correctOption = String(question.correctAnswer || "A").toUpperCase().charCodeAt(0) - 65;
    const isCorrect = selectedOption !== null && selectedOption === correctOption;

    if (selectedOption === null) skippedCount++;
    else if (isCorrect) correctCount++;
    else wrongCount++;

    return {
      questionID: question._id,
      questionText: question.questionText,
      options: question.options,
      selectedOption,
      correctOption,
      isCorrect
    };
  });

  const questionMark = Number(exam.markPerQuestion) || 0;
  const penalty = exam.negativeMarkingEnabled ? Number(exam.negativeMarkPerWrong) || 0 : 0;
  const totalMarks = questionMark * answerReview.length;
  const score = Math.max(0, correctCount * questionMark - wrongCount * penalty);
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

  return { answerReview, correctCount, wrongCount, skippedCount, score, totalMarks, percentage };
}

module.exports = { scoreExamAnswers };
