import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";

const updateUserSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BANNED"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireUser("ADMIN");
    const { userId } = await context.params;
    if (admin.id === userId) throw new ApiError(400, "Use another admin account to change your own access.", "SELF_MODERATION");
    const data = await parseJson(request, updateUserSchema);
    const user = await db.user.update({ where: { id: userId }, data });
    if (data.status === "BANNED") {
      await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await db.activityLog.create({ data: { userId: admin.id, action: "ADMIN_UPDATED_USER", entity: "User", entityId: userId, metadata: data } });
    return NextResponse.json({ user: { id: user.id, role: user.role, status: user.status } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireUser("ADMIN");
    const { userId } = await context.params;
    if (admin.id === userId) throw new ApiError(400, "You cannot delete your own account here.", "SELF_MODERATION");
    await db.user.delete({ where: { id: userId } });
    await db.activityLog.create({ data: { userId: admin.id, action: "ADMIN_DELETED_USER", entity: "User", entityId: userId } });
    return NextResponse.json({ message: "User deleted." });
  } catch (error) {
    return jsonError(error);
  }
}
