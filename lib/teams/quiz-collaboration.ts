import type { QuizCollaboratorRole } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { requireWorkspaceManager } from "@/lib/teams/invitations";

export async function prepareWorkspaceCollaborators(input: {
  collaboratorUserIds: string[];
  managerId: string;
  teamId: string;
}) {
  await requireWorkspaceManager(input.managerId, input.teamId);
  const selectedUserIds = [...new Set(input.collaboratorUserIds)].filter((userId) => userId !== input.managerId);
  const members = await db.teamMember.findMany({
    where: { teamId: input.teamId, userId: { in: selectedUserIds } },
    select: { userId: true },
  });
  if (members.length !== selectedUserIds.length) {
    throw new ApiError(422, "Select collaborators from the chosen workspace only.", "INVALID_COLLABORATOR");
  }
  return [
    { role: "MANAGER" as const, userId: input.managerId },
    ...selectedUserIds.map((userId) => ({ role: "EDITOR" as const, userId })),
  ];
}

export async function requireQuizManager(userId: string, quizId: string) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      collaborators: { where: { userId }, select: { role: true } },
      team: { select: { members: { where: { userId }, select: { role: true } } } },
    },
  });
  const workspaceRole = quiz?.team?.members[0]?.role;
  if (
    !quiz ||
    (quiz.authorId !== userId &&
      quiz.collaborators[0]?.role !== "MANAGER" &&
      workspaceRole !== "OWNER" &&
      workspaceRole !== "ADMIN")
  ) {
    throw new ApiError(403, "You do not have permission to manage this quiz.", "FORBIDDEN");
  }
  return quiz;
}

export async function replaceQuizCollaborators(
  quizId: string,
  collaborators: Array<{ role: QuizCollaboratorRole; userId: string }>,
) {
  const quiz = await db.quiz.findUnique({ where: { id: quizId }, select: { teamId: true } });
  if (!quiz?.teamId) throw new ApiError(422, "Assign this quiz to a workspace before adding collaborators.", "WORKSPACE_REQUIRED");
  const normalized = [...new Map(collaborators.map((entry) => [entry.userId, entry])).values()];
  const members = await db.teamMember.findMany({ where: { teamId: quiz.teamId, userId: { in: normalized.map((entry) => entry.userId) } }, select: { userId: true } });
  if (members.length !== normalized.length) throw new ApiError(422, "Every collaborator must belong to the quiz workspace.", "INVALID_COLLABORATOR");
  await db.$transaction([
    db.quizCollaborator.deleteMany({ where: { quizId } }),
    ...normalized.map((entry) => db.quizCollaborator.create({ data: { quizId, ...entry } })),
  ]);
}
