import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";

export async function DELETE(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { sessionId } = await context.params;
    await db.session.updateMany({ where: { id: sessionId, userId: user.id }, data: { revokedAt: new Date() } });
    return NextResponse.json({ message: "Session revoked." });
  } catch (error) {
    return jsonError(error);
  }
}
