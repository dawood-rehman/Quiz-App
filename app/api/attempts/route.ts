import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { submitAttemptSchema } from "@/lib/quiz/schemas";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { recordActivityDay } from "@/lib/analytics/progress";
import { evaluateQuizPerformance } from "@/lib/ai/openrouter";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const data = await parseJson(request, submitAttemptSchema);
    const challenge = data.teamChallengeId
      ? await db.teamChallenge.findFirst({
          where: {
            id: data.teamChallengeId,
            quizId: data.quizId,
            status: "OPEN",
            OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
            team: { members: { some: { userId: user.id } } },
          },
        })
      : undefined;
    if (data.teamChallengeId && !challenge) {
      throw new ApiError(403, "This team challenge is unavailable or you are not a member.", "CHALLENGE_UNAVAILABLE");
    }
    const quiz = await db.quiz.findFirst({
      where: { id: data.quizId, status: "PUBLISHED" },
      include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
    });
    if (!quiz) throw new ApiError(404, "Quiz not found.", "QUIZ_NOT_FOUND");

    const answersByQuestion = new Map(data.answers.map((answer) => [answer.questionId, answer.optionId]));
    if (answersByQuestion.size !== quiz.questions.length) {
      throw new ApiError(422, "Answer every question before submitting.", "INCOMPLETE_ATTEMPT");
    }

    const evaluated = quiz.questions.map((question) => {
      const optionId = answersByQuestion.get(question.id);
      const option = question.options.find((candidate) => candidate.id === optionId);
      if (!option) throw new ApiError(422, "An answer does not belong to this quiz.", "INVALID_ANSWER");
      return { question, option, isCorrect: option.isCorrect };
    });
    const score = evaluated.filter((answer) => answer.isCorrect).length;

    await db.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: quiz.id,
        durationSeconds: data.durationSeconds,
        teamChallengeId: challenge?.id,
        score,
        total: quiz.questions.length,
        answers: {
          create: evaluated.map(({ question, option, isCorrect }) => ({
            questionId: question.id,
            optionId: option.id,
            isCorrect,
          })),
        },
      },
    });
    const progress = await recordActivityDay(user.id, data.timezone);
    const baseReview = evaluated.map(({ question, option, isCorrect }) => ({
      questionId: question.id,
      selected: option.label,
      correct: question.options.find((candidate) => candidate.isCorrect)?.label ?? "",
      isCorrect,
      explanation: question.explanation,
    }));
    const evaluation = await evaluateQuizPerformance({
      topic: quiz.topic,
      score,
      total: quiz.questions.length,
      answers: baseReview.map((answer) => ({
        questionId: answer.questionId,
        prompt: quiz.questions.find((question) => question.id === answer.questionId)?.prompt ?? "",
        selected: answer.selected,
        correct: answer.correct,
        isCorrect: answer.isCorrect,
        baseExplanation: answer.explanation,
      })),
    }, user.id);
    const explanationByQuestion = new Map(evaluation.explanations.map((entry) => [entry.questionId, entry.explanation]));

    return NextResponse.json({
      score,
      total: quiz.questions.length,
      progress: {
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
      },
      feedback: { summary: evaluation.summary, suggestions: evaluation.suggestions },
      review: baseReview.map((answer) => ({
        ...answer,
        explanation: explanationByQuestion.get(answer.questionId) ?? answer.explanation,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
