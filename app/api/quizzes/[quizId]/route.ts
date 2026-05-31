import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ quizId: string }> }) {
  try {
    await requireUser();
    const { quizId } = await context.params;
    const quiz = await db.quiz.findFirst({
      where: { id: quizId, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        description: true,
        topic: true,
        difficulty: true,
        questions: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            prompt: true,
            options: {
              orderBy: { position: "asc" },
              select: { id: true, label: true },
            },
          },
        },
      },
    });

    if (!quiz) throw new ApiError(404, "Quiz not found.", "QUIZ_NOT_FOUND");
    return NextResponse.json({ quiz });
  } catch (error) {
    return jsonError(error);
  }
}
