import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { createTeamChallengeSchema } from "@/lib/teams/schemas";
import { requireWorkspaceManager } from "@/lib/teams/invitations";

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const manager = await requireUser();
    const { teamId } = await context.params;
    const data = await parseJson(request, createTeamChallengeSchema);
    await requireWorkspaceManager(manager.id, teamId);
    const quiz = await db.quiz.findFirst({ where: { id: data.quizId, status: "PUBLISHED", OR: [{ teamId }, { authorId: manager.id }] } });
    if (!quiz) throw new ApiError(404, "Quiz not found.", "QUIZ_NOT_FOUND");
    const challenge = await db.teamChallenge.create({
      data: { teamId, quizId: quiz.id, title: data.title, deadline: data.deadline ? new Date(data.deadline) : undefined, createdById: manager.id },
      select: { id: true },
    });
    await db.activityLog.create({ data: { userId: manager.id, action: "TEAM_CHALLENGE_CREATED", entity: "TeamChallenge", entityId: challenge.id, metadata: { teamId, quizId: quiz.id } } });
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
