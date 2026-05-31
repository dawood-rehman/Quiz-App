import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";

export async function DELETE(request: Request, context: { params: Promise<{ categoryId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireUser("ADMIN");
    const { categoryId } = await context.params;
    await db.category.delete({ where: { id: categoryId } });
    await db.activityLog.create({ data: { userId: admin.id, action: "ADMIN_DELETED_CATEGORY", entity: "Category", entityId: categoryId } });
    return NextResponse.json({ message: "Category deleted." });
  } catch (error) {
    return jsonError(error);
  }
}
