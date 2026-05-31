import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    await db.teamInvitation.updateMany({ where: { invitedUserId: user.id, expiresAt: { lte: new Date() }, status: "PENDING" }, data: { status: "EXPIRED" } });
    const invitations = await db.teamInvitation.findMany({
      where: { invitedUserId: user.id, expiresAt: { gt: new Date() }, status: "PENDING" },
      select: {
        id: true,
        createdAt: true,
        invitedBy: { select: { name: true } },
        team: { select: { id: true, name: true, description: true, _count: { select: { members: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invitations });
  } catch (error) {
    return jsonError(error);
  }
}
