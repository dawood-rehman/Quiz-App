import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ users: [] });
    const users = await db.user.findMany({
      where: {
        id: { not: user.id },
        status: "ACTIVE",
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 8,
    });
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}
