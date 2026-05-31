import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { replaceQuizCollaborators, requireQuizManager } from "@/lib/teams/quiz-collaboration";
import { updateQuizCollaboratorsSchema } from "@/lib/teams/schemas";

export async function GET(_request: Request, context: { params: Promise<{ quizId: string }> }) {
  try {
    const user = await requireUser();
    const { quizId } = await context.params;
    const quiz = await db.quiz.findUnique({ where: { id: quizId }, select: { authorId: true, teamId: true } });
    if (!quiz) throw new ApiError(404, "Quiz not found.", "QUIZ_NOT_FOUND");
    const membership = quiz.teamId ? await db.teamMember.findUnique({ where: { teamId_userId: { teamId: quiz.teamId, userId: user.id } } }) : undefined;
    if (quiz.authorId !== user.id && !membership) throw new ApiError(403, "You do not have access to this quiz workspace.", "FORBIDDEN");
    const collaborators = await db.quizCollaborator.findMany({
      where: { quizId },
      select: { id: true, role: true, user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ collaborators });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ quizId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { quizId } = await context.params;
    await requireQuizManager(user.id, quizId);
    const data = await parseJson(request, updateQuizCollaboratorsSchema);
    await replaceQuizCollaborators(quizId, data.collaborators);
    await db.activityLog.create({ data: { userId: user.id, action: "QUIZ_COLLABORATORS_UPDATED", entity: "Quiz", entityId: quizId, metadata: { count: data.collaborators.length } } });
    return NextResponse.json({ message: "Quiz collaborators updated." });
  } catch (error) {
    return jsonError(error);
  }
}
