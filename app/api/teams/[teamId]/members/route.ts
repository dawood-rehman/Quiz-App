import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    const user = await requireUser();
    const { teamId } = await context.params;
    if (!await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } })) {
      throw new ApiError(403, "Join this workspace to view its members.", "FORBIDDEN");
    }
    const members = await db.teamMember.findMany({
      where: { teamId },
      select: { id: true, role: true, user: { select: { id: true, email: true, name: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    return NextResponse.json({ members });
  } catch (error) {
    return jsonError(error);
  }
}
