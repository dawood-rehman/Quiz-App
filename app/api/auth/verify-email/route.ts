import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth/tokens";
import { autoAcceptPendingInvitations } from "@/lib/teams/invitations";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const redirect = new URL("/login", getEnv().APP_URL);
  if (!token) {
    redirect.searchParams.set("error", "invalid-verification");
    return NextResponse.redirect(redirect);
  }

  const storedToken = await db.verificationToken.findFirst({
    where: { tokenHash: hashToken(token), type: "EMAIL_VERIFICATION", expiresAt: { gt: new Date() } },
  });
  if (!storedToken) {
    redirect.searchParams.set("error", "invalid-verification");
    return NextResponse.redirect(redirect);
  }

  const [user] = await db.$transaction([
    db.user.update({ where: { id: storedToken.userId }, data: { emailVerifiedAt: new Date() }, select: { email: true, id: true } }),
    db.verificationToken.deleteMany({ where: { userId: storedToken.userId, type: "EMAIL_VERIFICATION" } }),
  ]);
  const acceptedWorkspaceInvitations = await autoAcceptPendingInvitations(user.id, user.email).catch((error) => {
    console.error("Workspace invitation reconciliation failed after email verification", error);
    return 0;
  });
  redirect.searchParams.set("verified", "true");
  if (acceptedWorkspaceInvitations) redirect.searchParams.set("workspaces", String(acceptedWorkspaceInvitations));
  return NextResponse.redirect(redirect);
}
