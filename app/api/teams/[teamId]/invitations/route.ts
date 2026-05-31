import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { inviteTeamMemberSchema } from "@/lib/teams/schemas";
import { inviteWorkspaceMember } from "@/lib/teams/invitations";

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const manager = await requireUser();
    const { teamId } = await context.params;
    const data = await parseJson(request, inviteTeamMemberSchema);
    const result = await inviteWorkspaceMember({ ...data, invitedById: manager.id, teamId });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
