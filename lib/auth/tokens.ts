import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { Role } from "@prisma/client";
import { getJwtSecret } from "@/lib/config/env";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/auth/constants";

export type AccessClaims = {
  userId: string;
  email: string;
  name: string;
  role: Role;
};

export async function signAccessToken(claims: AccessClaims) {
  return new SignJWT({ ...claims, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .setSubject(claims.userId)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });

  if (
    payload.type !== "access" ||
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string" ||
    (payload.role !== "USER" && payload.role !== "ADMIN")
  ) {
    throw new Error("Invalid access token.");
  }

  return payload as typeof payload & AccessClaims;
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function encodeRefreshCookie(sessionId: string, token: string) {
  return `${sessionId}.${token}`;
}

export function decodeRefreshCookie(value?: string) {
  const [sessionId, token, ...rest] = value?.split(".") ?? [];
  return sessionId && token && rest.length === 0 ? { sessionId, token } : undefined;
}
