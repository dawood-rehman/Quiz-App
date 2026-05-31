import { db } from "@/lib/db";
import { ApiError } from "@/lib/http";

export async function leaveWorkspace(userId: string, teamId: string) {
  const membership = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!membership) {
    throw new ApiError(404, "You are not a member of this workspace.", "MEMBER_NOT_FOUND");
  }

  const otherMembers = await db.teamMember.findMany({
    where: { teamId, userId: { not: userId } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  if (membership.role === "OWNER" && !otherMembers.length) {
    throw new ApiError(
      422,
      "You are the only member. Delete the workspace instead of leaving.",
      "SOLE_OWNER",
    );
  }

  await db.$transaction(async (transaction) => {
    if (membership.role === "OWNER") {
      const successor =
        otherMembers.find((member) => member.role === "ADMIN") ?? otherMembers[0];
      await transaction.teamMember.update({
        where: { id: successor.id },
        data: { role: "OWNER" },
      });
      await transaction.team.update({
        where: { id: teamId },
        data: { ownerId: successor.userId },
      });
    }

    await transaction.quizCollaborator.deleteMany({
      where: { userId, quiz: { teamId } },
    });
    await transaction.teamMember.delete({ where: { id: membership.id } });
  });

  await db.activityLog.create({
    data: {
      userId,
      action: "WORKSPACE_MEMBER_LEFT",
      entity: "Team",
      entityId: teamId,
    },
  });
}
