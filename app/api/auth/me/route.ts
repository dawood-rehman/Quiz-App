import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import { updateProfileSchema } from "@/lib/auth/schemas";
import { createVerificationToken } from "@/lib/auth/service";
import { requireUser } from "@/lib/auth/current-user";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertTrustedOrigin(request);
    const currentUser = await requireUser();
    const data = await parseJson(request, updateProfileSchema);
    const updates: { name?: string; email?: string; emailVerifiedAt?: Date | null } = {};

    if (data.name && data.name !== currentUser.name) {
      updates.name = data.name;
    }

    let verificationSent = false;
    if (data.email && data.email !== currentUser.email) {
      const existing = await db.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== currentUser.id) {
        throw new ApiError(409, "An account with that email already exists.", "EMAIL_IN_USE");
      }
      updates.email = data.email;
      updates.emailVerifiedAt = null;
    }

    if (!updates.name && !updates.email) {
      return NextResponse.json({
        message: "No profile changes were submitted.",
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          emailVerifiedAt: currentUser.emailVerifiedAt,
        },
      });
    }

    const user = await db.user.update({
      where: { id: currentUser.id },
      data: updates,
    });

    if (updates.email) {
      const token = await createVerificationToken(user.id, "EMAIL_VERIFICATION");
      const verifyUrl = `${getEnv().APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: user.email,
        subject: "Verify your new QuizForge email address",
        text: `Confirm your new email address for QuizForge: ${verifyUrl}`,
      });
      verificationSent = true;
    }

    if (updates.name) {
      await db.activityLog.create({
        data: { action: "USER_PROFILE_UPDATED", entity: "User", entityId: user.id, userId: user.id },
      });
    }

    return NextResponse.json({
      message: verificationSent
        ? "Profile updated. We sent a verification link to your new email address."
        : "Profile updated successfully.",
      verificationSent,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
