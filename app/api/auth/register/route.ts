import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/config/env";
import { sendEmail } from "@/lib/email";
import { registerSchema } from "@/lib/auth/schemas";
import { createVerificationToken } from "@/lib/auth/service";
import { jsonError, getClientIp, parseJson, ApiError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { hashPassword } from "@/lib/security/password";
import { assertRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    assertRateLimit(`register:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    const data = await parseJson(request, registerSchema);
    if (await db.user.findUnique({ where: { email: data.email } })) {
      throw new ApiError(409, "An account with that email already exists.", "EMAIL_IN_USE");
    }

    const user = await db.user.create({
      data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) },
    });
    const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION");
    const env = getEnv();
    const verifyUrl = `${env.APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    let emailDelivery;
    try {
      emailDelivery = await sendEmail({
        to: user.email,
        subject: "Verify your QuizForge account",
        text: `Welcome to QuizForge. Verify your email address: ${verifyUrl}`,
      });
    } catch (error) {
      await db.user.delete({ where: { id: user.id } }).catch((deleteError: unknown) => {
        console.error("Failed to roll back user after email delivery failure", deleteError);
      });
      throw error;
    }
    await db.activityLog.create({ data: { action: "USER_REGISTERED", entity: "User", entityId: user.id, userId: user.id } });

    return NextResponse.json(
      {
        message: emailDelivery === "provider"
          ? `We sent a verification link to ${user.email}. Open it to verify your account before signing in.`
          : "Account created. Use the development verification link below to activate it.",
        verificationUrl: emailDelivery === "development" ? verifyUrl : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
