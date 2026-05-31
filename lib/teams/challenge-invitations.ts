import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ApiError } from "@/lib/http";

export async function inviteChallengeCollaborators(input: {
  challengeId: string;
  collaboratorUserIds: string[];
  invitedById: string;
  teamId: string;
  challengeTitle: string;
  teamName: string;
}) {
  const uniqueIds = [...new Set(input.collaboratorUserIds)];
  const members = await db.teamMember.findMany({
    where: { teamId: input.teamId, userId: { in: uniqueIds } },
    select: { userId: true, user: { select: { email: true, name: true } } },
  });
  if (members.length !== uniqueIds.length) {
    throw new ApiError(422, "All invited users must be workspace members.", "INVALID_COLLABORATORS");
  }

  const invitations = await db.$transaction(async (transaction) => {
    const created = [];
    for (const userId of uniqueIds) {
      const invitation = await transaction.teamChallengeInvitation.upsert({
        where: { challengeId_userId: { challengeId: input.challengeId, userId } },
        create: {
          challengeId: input.challengeId,
          invitedById: input.invitedById,
          status: userId === input.invitedById ? "ACCEPTED" : "PENDING",
          respondedAt: userId === input.invitedById ? new Date() : undefined,
          userId,
        },
        update: {},
        select: { id: true, status: true, user: { select: { email: true, name: true } } },
      });
      created.push(invitation);
    }
    return created;
  });

  const challengeUrl = `${getEnv().APP_URL}/teams`;
  await Promise.all(
    invitations
      .filter((invitation) => invitation.status === "PENDING")
      .map((invitation) =>
        sendEmail({
          to: invitation.user.email,
          subject: `Challenge invite: ${input.challengeTitle}`,
          text: `You were invited to join the "${input.challengeTitle}" challenge in ${input.teamName}. Open QuizForge to accept or decline: ${challengeUrl}`,
        }).catch((error) => console.warn("Challenge invitation email could not be delivered", error)),
      ),
  );

  return invitations.length;
}

export async function requireAcceptedChallengeInvitation(userId: string, challengeId: string) {
  const invitation = await db.teamChallengeInvitation.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (!invitation || invitation.status !== "ACCEPTED") {
    throw new ApiError(
      403,
      "Accept the challenge invitation before participating.",
      "CHALLENGE_INVITATION_REQUIRED",
    );
  }
}
