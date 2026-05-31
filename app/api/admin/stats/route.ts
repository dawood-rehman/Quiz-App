import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireUser("ADMIN");
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [users, activeUsers, attempts, completedThisWeek, aiRequests, recentLogs] = await Promise.all([
      db.user.count(),
      db.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
      db.quizAttempt.count(),
      db.quizAttempt.count({ where: { completedAt: { gte: weekAgo } } }),
      db.aIRequest.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: weekAgo } } }),
      db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    ]);
    return NextResponse.json({ users, activeUsers, attempts, completedThisWeek, aiRequests, recentLogs });
  } catch (error) {
    return jsonError(error);
  }
}
