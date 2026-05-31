import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth/constants";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { decodeRefreshCookie } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const refreshCookie = decodeRefreshCookie((await cookies()).get(REFRESH_COOKIE)?.value);
    if (refreshCookie) {
      await db.session.updateMany({ where: { id: refreshCookie.sessionId }, data: { revokedAt: new Date() } });
    }
    await clearAuthCookies();
    return NextResponse.json({ message: "Signed out." });
  } catch (error) {
    return jsonError(error);
  }
}
