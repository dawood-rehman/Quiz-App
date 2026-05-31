import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { hashToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { hashPassword } from "@/lib/security/password";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const data = await parseJson(request, resetPasswordSchema);
    const storedToken = await db.verificationToken.findFirst({
      where: { tokenHash: hashToken(data.token), type: "PASSWORD_RESET", expiresAt: { gt: new Date() } },
    });
    if (!storedToken) throw new ApiError(400, "This reset link is invalid or expired.", "INVALID_RESET_TOKEN");

    await db.$transaction([
      db.user.update({ where: { id: storedToken.userId }, data: { passwordHash: await hashPassword(data.password) } }),
      db.verificationToken.deleteMany({ where: { userId: storedToken.userId, type: "PASSWORD_RESET" } }),
      db.session.updateMany({ where: { userId: storedToken.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    return NextResponse.json({ message: "Password reset. You can sign in with your new password." });
  } catch (error) {
    return jsonError(error);
  }
}
