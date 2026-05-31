import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { inviteChallengeCollaborators } from "@/lib/teams/challenge-invitations";
import { requireWorkspaceManager } from "@/lib/teams/invitations";
import { createTeamChallengeSchema } from "@/lib/teams/schemas";

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const manager = await requireUser();
    const { teamId } = await context.params;
    const data = await parseJson(request, createTeamChallengeSchema);
    const membership = await requireWorkspaceManager(manager.id, teamId);
    const quiz = await db.quiz.findFirst({ where: { id: data.quizId, status: "PUBLISHED", OR: [{ teamId }, { authorId: manager.id }] } });
    if (!quiz) throw new ApiError(404, "Quiz not found.", "QUIZ_NOT_FOUND");
    const collaboratorUserIds = [...new Set([manager.id, ...data.collaboratorUserIds])];
    const challenge = await db.teamChallenge.create({
      data: { teamId, quizId: quiz.id, title: data.title, deadline: data.deadline ? new Date(data.deadline) : undefined, createdById: manager.id },
      select: { id: true, title: true },
    });
    await inviteChallengeCollaborators({
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      collaboratorUserIds,
      invitedById: manager.id,
      teamId,
      teamName: membership.team.name,
    });
    await db.activityLog.create({ data: { userId: manager.id, action: "TEAM_CHALLENGE_CREATED", entity: "TeamChallenge", entityId: challenge.id, metadata: { teamId, quizId: quiz.id, invitedCount: collaboratorUserIds.length } } });
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
