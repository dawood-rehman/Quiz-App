import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const scope = new URL(request.url).searchParams.get("scope");
    const user = scope === "mine" ? await requireUser() : undefined;
    const quizzes = await db.quiz.findMany({
      where: { status: "PUBLISHED", ...(user ? { authorId: user.id } : {}) },
      select: {
        id: true,
        title: true,
        description: true,
        topic: true,
        difficulty: true,
        isAIGenerated: true,
        createdAt: true,
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ quizzes });
  } catch (error) {
    return jsonError(error);
  }
}
