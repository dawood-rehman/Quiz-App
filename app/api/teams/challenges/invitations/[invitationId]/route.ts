import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { respondToChallengeInvitationSchema } from "@/lib/teams/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { invitationId } = await context.params;
    const data = await parseJson(request, respondToChallengeInvitationSchema);
    const invitation = await db.teamChallengeInvitation.findFirst({
      where: { id: invitationId, userId: user.id, status: "PENDING" },
      include: { challenge: { select: { status: true } } },
    });
    if (!invitation) {
      throw new ApiError(404, "Challenge invitation not found.", "INVITATION_NOT_FOUND");
    }
    if (invitation.challenge.status !== "OPEN") {
      throw new ApiError(422, "This challenge is no longer open.", "CHALLENGE_CLOSED");
    }

    const updated = await db.teamChallengeInvitation.update({
      where: { id: invitation.id },
      data: {
        status: data.action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: data.action === "ACCEPT" ? "CHALLENGE_INVITATION_ACCEPTED" : "CHALLENGE_INVITATION_DECLINED",
        entity: "TeamChallengeInvitation",
        entityId: invitation.id,
        metadata: { challengeId: invitation.challengeId },
      },
    });

    return NextResponse.json({ accepted: data.action === "ACCEPT", invitation: updated });
  } catch (error) {
    return jsonError(error);
  }
}
