import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireUser("ADMIN");
    const query = new URL(request.url).searchParams.get("query")?.trim().slice(0, 80);
    const users = await db.user.findMany({
      where: query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : undefined,
      select: { id: true, name: true, email: true, role: true, status: true, emailVerifiedAt: true, createdAt: true, _count: { select: { attempts: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}
