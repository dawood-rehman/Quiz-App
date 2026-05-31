import type { TokenType, User } from "@prisma/client";
import { db } from "@/lib/db";
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/auth/constants";
import { createOpaqueToken, hashToken, signAccessToken } from "@/lib/auth/tokens";
import { getClientIp } from "@/lib/http";

export async function createSession(user: Pick<User, "id" | "email" | "name" | "role">, request: Request) {
  const refreshToken = createOpaqueToken();
  const session = await db.session.create({
    data: {
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      userId: user.id,
    },
  });

  return {
    accessToken: await signAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }),
    refreshToken,
    sessionId: session.id,
  };
}

export async function createVerificationToken(userId: string, type: TokenType) {
  const token = createOpaqueToken();
  const ttl = type === "EMAIL_VERIFICATION" ? EMAIL_VERIFICATION_TTL_MS : PASSWORD_RESET_TTL_MS;

  await db.$transaction([
    db.verificationToken.deleteMany({ where: { userId, type } }),
    db.verificationToken.create({
      data: {
        tokenHash: hashToken(token),
        type,
        userId,
        expiresAt: new Date(Date.now() + ttl),
      },
    }),
  ]);

  return token;
}
