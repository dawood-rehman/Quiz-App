import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { requireWorkspaceQuizDeletion } from "@/lib/teams/quiz-collaboration";

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

export async function DELETE(request: Request, context: { params: Promise<{ quizId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { quizId } = await context.params;
    const quiz = await requireWorkspaceQuizDeletion(user.id, quizId);

    await db.quiz.delete({ where: { id: quiz.id } });
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "QUIZ_DELETED",
        entity: "Quiz",
        entityId: quiz.id,
        metadata: { title: quiz.title, teamId: quiz.teamId },
      },
    });

    return NextResponse.json({ message: "Quiz deleted." });
  } catch (error) {
    return jsonError(error);
  }
}
