import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await db.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    return jsonError(error);
  }
}
