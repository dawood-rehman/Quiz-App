import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { requireWorkspaceManager } from "@/lib/teams/invitations";
import { updateTeamMemberSchema } from "@/lib/teams/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ teamId: string; memberId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const manager = await requireUser();
    const { teamId, memberId } = await context.params;
    await requireWorkspaceManager(manager.id, teamId);
    const data = await parseJson(request, updateTeamMemberSchema);
    const member = await db.teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) throw new ApiError(404, "Workspace member not found.", "MEMBER_NOT_FOUND");
    if (member.role === "OWNER") throw new ApiError(422, "Workspace owners cannot be downgraded.", "OWNER_PROTECTED");
    const updated = await db.teamMember.update({ where: { id: member.id }, data: { role: data.role } });
    await db.activityLog.create({ data: { userId: manager.id, action: "WORKSPACE_MEMBER_ROLE_UPDATED", entity: "TeamMember", entityId: member.id, metadata: { role: data.role, teamId } } });
    return NextResponse.json({ member: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ teamId: string; memberId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const manager = await requireUser();
    const { teamId, memberId } = await context.params;
    await requireWorkspaceManager(manager.id, teamId);
    const member = await db.teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) throw new ApiError(404, "Workspace member not found.", "MEMBER_NOT_FOUND");
    if (member.role === "OWNER") throw new ApiError(422, "Workspace owners cannot be removed.", "OWNER_PROTECTED");
    await db.$transaction([
      db.quizCollaborator.deleteMany({ where: { userId: member.userId, quiz: { teamId } } }),
      db.teamMember.delete({ where: { id: member.id } }),
    ]);
    await db.activityLog.create({ data: { userId: manager.id, action: "WORKSPACE_MEMBER_REMOVED", entity: "TeamMember", entityId: member.id, metadata: { teamId } } });
    return NextResponse.json({ message: "Workspace member removed." });
  } catch (error) {
    return jsonError(error);
  }
}
