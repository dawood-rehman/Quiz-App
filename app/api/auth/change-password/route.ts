import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/auth/schemas";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { hashPassword, verifyPassword } from "@/lib/security/password";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const data = await parseJson(request, changePasswordSchema);
    if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
      throw new ApiError(401, "Current password is incorrect.", "INVALID_CREDENTIALS");
    }

    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.newPassword) } }),
      db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await clearAuthCookies();
    return NextResponse.json({ message: "Password changed. Sign in again on your devices." });
  } catch (error) {
    return jsonError(error);
  }
}
