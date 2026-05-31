import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { respondToInvitationSchema } from "@/lib/teams/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { invitationId } = await context.params;
    const data = await parseJson(request, respondToInvitationSchema);
    const invitation = await db.teamInvitation.findFirst({
      where: { expiresAt: { gt: new Date() }, id: invitationId, invitedUserId: user.id, status: "PENDING" },
    });
    if (!invitation) throw new ApiError(404, "Team invitation not found.", "INVITATION_NOT_FOUND");

    await db.$transaction(async (transaction) => {
      await transaction.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: data.action === "ACCEPT" ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
      });
      if (data.action === "ACCEPT") {
        await transaction.teamMember.upsert({
          where: { teamId_userId: { teamId: invitation.teamId, userId: user.id } },
          create: { teamId: invitation.teamId, userId: user.id },
          update: {},
        });
        if (invitation.quizId && invitation.quizRole) {
          await transaction.quizCollaborator.upsert({
            where: { quizId_userId: { quizId: invitation.quizId, userId: user.id } },
            create: { quizId: invitation.quizId, role: invitation.quizRole, userId: user.id },
            update: { role: invitation.quizRole },
          });
        }
      }
    });
    return NextResponse.json({ accepted: data.action === "ACCEPT" });
  } catch (error) {
    return jsonError(error);
  }
}
