import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { requireWorkspaceManager, sendWorkspaceInvitationEmail } from "@/lib/teams/invitations";

export async function POST(request: Request, context: { params: Promise<{ teamId: string; invitationId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const manager = await requireUser();
    const { teamId, invitationId } = await context.params;
    await requireWorkspaceManager(manager.id, teamId);
    const invitation = await db.teamInvitation.findFirst({ where: { id: invitationId, status: { in: ["PENDING", "EXPIRED"] }, teamId } });
    if (!invitation) throw new ApiError(404, "Pending workspace invitation not found.", "INVITATION_NOT_FOUND");
    await sendWorkspaceInvitationEmail({ invitationId });
    await db.activityLog.create({ data: { userId: manager.id, action: "WORKSPACE_INVITATION_RESENT", entity: "TeamInvitation", entityId: invitation.id } });
    return NextResponse.json({ message: "Invitation email sent again." });
  } catch (error) {
    return jsonError(error);
  }
}
