import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { createVerificationToken } from "@/lib/auth/service";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getClientIp, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    assertRateLimit(`forgot:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    const { email } = await parseJson(request, forgotPasswordSchema);
    const user = await db.user.findUnique({ where: { email } });

    if (user?.status === "ACTIVE") {
      const token = await createVerificationToken(user.id, "PASSWORD_RESET");
      const resetUrl = `${getEnv().APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail({ to: email, subject: "Reset your QuizForge password", text: `Reset your password: ${resetUrl}` });
    }

    return NextResponse.json({ message: "If that account exists, a reset link is on its way." });
  } catch (error) {
    return jsonError(error);
  }
}
