import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth/schemas";
import { setAuthCookies } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/service";
import { ApiError, getClientIp, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { verifyPassword } from "@/lib/security/password";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { autoAcceptPendingInvitations } from "@/lib/teams/invitations";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    assertRateLimit(`login:${getClientIp(request)}`, 10, 15 * 60 * 1000);
    const data = await parseJson(request, loginSchema);
    const user = await db.user.findUnique({ where: { email: data.email } });

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      throw new ApiError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    }
    if (user.status === "BANNED") throw new ApiError(403, "This account has been suspended.", "ACCOUNT_SUSPENDED");
    if (!user.emailVerifiedAt) throw new ApiError(403, "Verify your email before signing in.", "EMAIL_NOT_VERIFIED");
    await autoAcceptPendingInvitations(user.id, user.email).catch((error: unknown) => {
      console.error("Workspace invitation reconciliation failed during login", error);
    });

    const session = await createSession(user, request);
    await setAuthCookies(session.accessToken, session.sessionId, session.refreshToken);
    await db.activityLog.create({ data: { action: "USER_LOGGED_IN", entity: "Session", entityId: session.sessionId, userId: user.id } });

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return jsonError(error);
  }
}
