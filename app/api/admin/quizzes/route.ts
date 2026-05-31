import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError, parseJson } from "@/lib/http";
import { createQuizSchema } from "@/lib/quiz/schemas";
import { assertTrustedOrigin } from "@/lib/security/csrf";

export async function GET() {
  try {
    await requireUser("ADMIN");
    const quizzes = await db.quiz.findMany({
      include: { category: true, _count: { select: { questions: true, attempts: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ quizzes });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireUser("ADMIN");
    const data = await parseJson(request, createQuizSchema);
    const quiz = await db.quiz.create({
      data: {
        ...data,
        authorId: admin.id,
        questions: {
          create: data.questions.map((question, questionIndex) => ({
            prompt: question.prompt,
            explanation: question.explanation,
            position: questionIndex,
            options: { create: question.options.map((option, optionIndex) => ({ ...option, position: optionIndex })) },
          })),
        },
      },
    });
    await db.activityLog.create({ data: { userId: admin.id, action: "ADMIN_CREATED_QUIZ", entity: "Quiz", entityId: quiz.id } });
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
