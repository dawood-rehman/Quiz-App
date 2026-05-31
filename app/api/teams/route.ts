import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { createTeamSchema } from "@/lib/teams/schemas";

export async function GET() {
  try {
    const user = await requireUser();
    const teams = await db.team.findMany({
      where: { members: { some: { userId: user.id } } },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
        members: { where: { userId: user.id }, select: { role: true } },
        _count: { select: { challenges: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ teams: teams.map((team) => ({ ...team, role: team.members[0]?.role })) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const data = await parseJson(request, createTeamSchema);
    const team = await db.team.create({
      data: {
        ...data,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
      select: { id: true, name: true },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "TEAM_CREATED", entity: "Team", entityId: team.id } });
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
