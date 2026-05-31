import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/auth/constants";
import { encodeRefreshCookie } from "@/lib/auth/tokens";
import { getEnv } from "@/lib/config/env";

export async function setAuthCookies(accessToken: string, sessionId: string, refreshToken: string) {
  const cookieStore = await cookies();
  const secure = new URL(getEnv().APP_URL).protocol === "https:";
  const shared = { httpOnly: true, secure, sameSite: "strict" as const, path: "/" };

  cookieStore.set(ACCESS_COOKIE, accessToken, { ...shared, maxAge: ACCESS_TOKEN_TTL_SECONDS });
  cookieStore.set(REFRESH_COOKIE, encodeRefreshCookie(sessionId, refreshToken), {
    ...shared,
    maxAge: REFRESH_TOKEN_TTL_MS / 1000,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}
