import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { leaveWorkspace } from "@/lib/teams/leave";

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { teamId } = await context.params;
    await leaveWorkspace(user.id, teamId);
    return NextResponse.json({ message: "You left the workspace." });
  } catch (error) {
    return jsonError(error);
  }
}
