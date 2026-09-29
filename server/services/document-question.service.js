const mongoose = require("mongoose");
const { authRepository } = require("../repositories/auth.repository");

function reply(status, body) {
  return { status, body };
}

async function generateQuestionsFromDocument({ teacherId, text, file, subject, class: questionClass, language = "English", count = 10 }) {
  try {
    if (!mongoose.isValidObjectId(teacherId)) return reply(400, { error: "Please sign in again as a teacher." });
    const teacher = await authRepository.findOne({ _id: teacherId, role: "teacher" }).select("_id");
    if (!teacher) return reply(403, { error: "A teacher account is required." });
    if (!subject?.trim() || !questionClass?.trim()) return reply(400, { error: "Subject and class are required." });
    if (![5, 10, 15, 20].includes(Number(count))) return reply(400, { error: "Choose between 5 and 20 questions." });
    if (!process.env.GEMINI_API_KEY) return reply(503, { error: "AI question generation is not configured. Add GEMINI_API_KEY to server/.env." });

    const parts = [{ text: `Create exactly ${Number(count)} original multiple-choice questions based only on the provided study material. Language: ${language}. Each question must have four plausible options, exactly one correct answer, and age-appropriate wording. Preserve mathematical notation clearly. Return only JSON matching {"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"A"}]}. The correctAnswer must be A, B, C, or D. Do not invent facts beyond the source.` }];
    if (typeof text === "string" && text.trim()) {
      parts.push({ text: `Study material:\n${text.slice(0, 30000)}` });
    } else if (file && typeof file.data === "string") {
      const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
      const base64 = file.data.replace(/^data:[^,]+,/, "");
      if (!allowed.has(file.mimeType) || base64.length > 14_000_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        return reply(400, { error: "Upload a PDF or image smaller than 10 MB." });
      }
      parts.push({ inline_data: { mime_type: file.mimeType, data: base64 } });
    } else {
      return reply(400, { error: "The uploaded document did not contain readable content. Try a clearer PDF or image." });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { questions: { type: "ARRAY", items: { type: "OBJECT", properties: {
              question: { type: "STRING" },
              options: { type: "ARRAY", items: { type: "STRING" } },
              correctAnswer: { type: "STRING", enum: ["A", "B", "C", "D"] }
            }, required: ["question", "options", "correctAnswer"] } } },
            required: ["questions"]
          }
        }
      }),
      signal: AbortSignal.timeout(120000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Gemini generation error:", response.status, payload.error?.message || "Unknown provider error");
      const status = response.status === 429 ? 429 : response.status === 400 ? 422 : 502;
      const error = response.status === 429
        ? "AI service is busy. Please wait a moment and try again."
        : "AI could not process this file. Try a clearer or shorter document.";
      return reply(status, { error });
    }

    const responseText = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("");
    const questions = JSON.parse(responseText || "{}").questions;
    const validQuestions = Array.isArray(questions) ? questions.filter(question =>
      typeof question.question === "string" && question.question.trim() &&
      Array.isArray(question.options) && question.options.length === 4 && question.options.every(option => typeof option === "string" && option.trim()) &&
      ["A", "B", "C", "D"].includes(question.correctAnswer)
    ).slice(0, Number(count)) : [];

    if (!validQuestions.length) return reply(502, { error: "No valid questions could be created. Try another source document." });
    return reply(200, { questions: validQuestions, subject: subject.trim(), class: questionClass.trim() });
  } catch (error) {
    console.error("OCR question generation failed:", error.message);
    return reply(502, { error: "Question generation failed. Please try again." });
  }
}

module.exports = { generateQuestionsFromDocument };
