import type { Prisma, QuizCollaboratorRole, TeamRole } from "@prisma/client";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ApiError } from "@/lib/http";
import { createOpaqueToken, hashToken } from "@/lib/auth/tokens";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function requireWorkspaceManager(userId: string, teamId: string) {
  const membership = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { team: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new ApiError(403, "Only workspace owners and admins can manage collaborators.", "FORBIDDEN");
  }
  return membership;
}

export async function requireWorkspaceOwner(userId: string, teamId: string) {
  const membership = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { team: true },
  });
  if (!membership || membership.role !== "OWNER") {
    throw new ApiError(403, "Only the workspace owner can delete this workspace.", "FORBIDDEN");
  }
  return membership;
}

async function expirePendingInvitations(teamId?: string) {
  await db.teamInvitation.updateMany({
    where: { expiresAt: { lte: new Date() }, status: "PENDING", ...(teamId ? { teamId } : {}) },
    data: { status: "EXPIRED" },
  });
}

async function addCollaborator(
  transaction: Prisma.TransactionClient,
  quizId: string | undefined,
  userId: string,
  role: QuizCollaboratorRole | undefined,
) {
  if (!quizId || !role) return;
  await transaction.quizCollaborator.upsert({
    where: { quizId_userId: { quizId, userId } },
    create: { quizId, role, userId },
    update: { role },
  });
}

export async function inviteWorkspaceMember(input: {
  email: string;
  invitedById: string;
  quizId?: string;
  quizRole?: QuizCollaboratorRole;
  role: Exclude<TeamRole, "OWNER">;
  teamId: string;
}) {
  const membership = await requireWorkspaceManager(input.invitedById, input.teamId);
  await expirePendingInvitations(input.teamId);
  const email = input.email.trim().toLowerCase();
  const [invitedUser, quiz] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    input.quizId ? db.quiz.findFirst({ where: { id: input.quizId, teamId: input.teamId } }) : undefined,
  ]);
  if (input.quizId && !quiz) throw new ApiError(404, "Workspace quiz not found.", "QUIZ_NOT_FOUND");
  if (invitedUser?.status === "BANNED") throw new ApiError(422, "This account cannot be added to a workspace.", "USER_UNAVAILABLE");
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  if (invitedUser) {
    await db.$transaction(async (transaction) => {
      const existingMember = await transaction.teamMember.findUnique({
        where: { teamId_userId: { teamId: input.teamId, userId: invitedUser.id } },
      });
      if (existingMember?.role !== "OWNER") {
        await transaction.teamMember.upsert({
          where: { teamId_userId: { teamId: input.teamId, userId: invitedUser.id } },
          create: { teamId: input.teamId, userId: invitedUser.id, role: input.role },
          update: {},
        });
      }
      await addCollaborator(transaction, input.quizId, invitedUser.id, input.quizRole);
      await transaction.teamInvitation.create({
        data: {
          acceptedAt: new Date(),
          email,
          expiresAt,
          invitedById: input.invitedById,
          invitedUserId: invitedUser.id,
          quizId: input.quizId,
          quizRole: input.quizRole,
          respondedAt: new Date(),
          role: input.role,
          status: "ACCEPTED",
          teamId: input.teamId,
          tokenHash,
        },
      });
    });
    await db.activityLog.create({
      data: { userId: input.invitedById, action: "WORKSPACE_MEMBER_ADDED", entity: "Team", entityId: input.teamId, metadata: { email, quizId: input.quizId } },
    });
    await sendEmail({
      to: email,
      subject: `You joined ${membership.team.name} on QuizForge`,
      text: `${membership.team.name} added you as a workspace ${input.role.toLowerCase()}. Log in to QuizForge: ${getEnv().APP_URL}/teams`,
    }).catch((error) => console.warn("Workspace membership notification could not be delivered", error));
    return { delivery: "added" as const, email, userId: invitedUser.id };
  }

  const existingPending = await db.teamInvitation.findFirst({
    where: { email, quizId: input.quizId ?? null, status: "PENDING", teamId: input.teamId },
    orderBy: { createdAt: "desc" },
  });
  const invitation = existingPending
    ? await db.teamInvitation.update({
        where: { id: existingPending.id },
        data: { expiresAt, invitedById: input.invitedById, quizRole: input.quizRole, role: input.role, tokenHash },
      })
    : await db.teamInvitation.create({
        data: { email, expiresAt, invitedById: input.invitedById, quizId: input.quizId, quizRole: input.quizRole, role: input.role, teamId: input.teamId, tokenHash },
      });
  await sendWorkspaceInvitationEmail({ invitationId: invitation.id, token });
  await db.activityLog.create({
    data: { userId: input.invitedById, action: "WORKSPACE_INVITATION_SENT", entity: "TeamInvitation", entityId: invitation.id, metadata: { email, quizId: input.quizId } },
  });
  return { delivery: "invited" as const, email, expiresAt };
}

export async function sendWorkspaceInvitationEmail({ invitationId, token }: { invitationId: string; token?: string }) {
  const nextToken = token ?? createOpaqueToken();
  const tokenHash = hashToken(nextToken);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const invitation = await db.teamInvitation.update({
    where: { id: invitationId },
    data: { expiresAt, status: "PENDING", tokenHash },
    include: { invitedBy: { select: { name: true } }, team: { select: { name: true } } },
  });
  const registrationUrl = `${getEnv().APP_URL}/signup?invitation=${encodeURIComponent(nextToken)}&email=${encodeURIComponent(invitation.email)}`;
  await sendEmail({
    to: invitation.email,
    subject: `Join ${invitation.team.name} on QuizForge`,
    text: `${invitation.invitedBy.name} invited you to join the ${invitation.team.name} workspace on QuizForge. Register before ${expiresAt.toISOString()} to accept the invitation: ${registrationUrl}`,
  });
  return invitation;
}

export async function autoAcceptPendingInvitations(userId: string, userEmail: string) {
  await expirePendingInvitations();
  const email = userEmail.trim().toLowerCase();
  const invitations = await db.teamInvitation.findMany({
    where: { email, expiresAt: { gt: new Date() }, status: "PENDING" },
  });
  if (!invitations.length) return 0;

  await db.$transaction(async (transaction) => {
    for (const invitation of invitations) {
      await transaction.teamMember.upsert({
        where: { teamId_userId: { teamId: invitation.teamId, userId } },
        create: { role: invitation.role, teamId: invitation.teamId, userId },
        update: {},
      });
      await addCollaborator(transaction, invitation.quizId ?? undefined, userId, invitation.quizRole ?? undefined);
      await transaction.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), invitedUserId: userId, respondedAt: new Date(), status: "ACCEPTED" },
      });
    }
  });
  await db.activityLog.create({
    data: { userId, action: "WORKSPACE_INVITATIONS_AUTO_ACCEPTED", entity: "User", entityId: userId, metadata: { count: invitations.length } },
  });
  return invitations.length;
}
