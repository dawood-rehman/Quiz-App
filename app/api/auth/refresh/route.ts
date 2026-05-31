import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { REFRESH_COOKIE, REFRESH_TOKEN_TTL_MS } from "@/lib/auth/constants";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { createOpaqueToken, decodeRefreshCookie, hashToken, signAccessToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { ApiError, jsonError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";

async function refreshSession() {
  const decoded = decodeRefreshCookie((await cookies()).get(REFRESH_COOKIE)?.value);
  if (!decoded) throw new ApiError(401, "Refresh session is missing.", "UNAUTHENTICATED");

  const session = await db.session.findUnique({ where: { id: decoded.sessionId }, include: { user: true } });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.refreshTokenHash !== hashToken(decoded.token) ||
    session.user.status !== "ACTIVE"
  ) {
    await clearAuthCookies();
    throw new ApiError(401, "Refresh session is no longer valid.", "UNAUTHENTICATED");
  }

  const refreshToken = createOpaqueToken();
  const accessToken = await signAccessToken({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  });
  await db.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  await setAuthCookies(accessToken, session.id, refreshToken);
}

function getSafeDestination(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    await refreshSession();
    return NextResponse.json({ message: "Session refreshed." });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    await refreshSession();
    return NextResponse.redirect(new URL(getSafeDestination(request), request.url));
  } catch {
    await clearAuthCookies();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("session", "expired");
    return NextResponse.redirect(loginUrl);
  }
}
