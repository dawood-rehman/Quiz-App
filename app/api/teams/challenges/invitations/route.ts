import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const invitations = await db.teamChallengeInvitation.findMany({
      where: { userId: user.id, status: "PENDING", challenge: { status: "OPEN" } },
      select: {
        id: true,
        createdAt: true,
        invitedBy: { select: { name: true } },
        challenge: {
          select: {
            id: true,
            title: true,
            team: { select: { id: true, name: true } },
            quiz: { select: { id: true, title: true, topic: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invitations });
  } catch (error) {
    return jsonError(error);
  }
}
