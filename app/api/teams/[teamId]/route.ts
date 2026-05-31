import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    const user = await requireUser();
    const { teamId } = await context.params;
    const membership = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } });
    if (!membership) throw new ApiError(403, "Join this team to view its dashboard.", "FORBIDDEN");
    const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

    const [team, quizzes] = await Promise.all([
      db.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          description: true,
          owner: { select: { id: true, name: true } },
          members: {
            select: {
              id: true,
              joinedAt: true,
              role: true,
              user: { select: { id: true, email: true, name: true, progress: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
          challenges: {
            select: {
              id: true,
              title: true,
              deadline: true,
              status: true,
              createdAt: true,
              quiz: { select: { id: true, title: true, topic: true, _count: { select: { questions: true } } } },
              attempts: {
                select: { completedAt: true, durationSeconds: true, score: true, total: true, user: { select: { id: true, name: true } } },
                orderBy: { completedAt: "desc" },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          invitations: canManage
            ? {
                where: { expiresAt: { gt: new Date() }, status: "PENDING" },
                select: { createdAt: true, email: true, expiresAt: true, id: true, quiz: { select: { id: true, title: true } }, role: true },
                orderBy: { createdAt: "desc" as const },
              }
            : false,
        },
      }),
      canManage
        ? db.quiz.findMany({
            where: { status: "PUBLISHED", OR: [{ authorId: user.id }, { teamId }] },
            select: { id: true, title: true, topic: true },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
    ]);
    if (!team) throw new ApiError(404, "Team not found.", "TEAM_NOT_FOUND");

    const memberStats = new Map(team.members.map((member) => [member.user.id, {
      accuracy: 0,
      completed: 0,
      correct: 0,
      durationSeconds: 0,
      name: member.user.name,
      streak: member.user.progress?.currentStreak ?? 0,
      total: 0,
      userId: member.user.id,
    }]));
    const activity = team.challenges.flatMap((challenge) =>
      challenge.attempts.map((attempt) => {
        const stats = memberStats.get(attempt.user.id);
        if (stats) {
          stats.completed += 1;
          stats.correct += attempt.score;
          stats.total += attempt.total;
          stats.durationSeconds += attempt.durationSeconds;
        }
        return {
          challengeTitle: challenge.title,
          completedAt: attempt.completedAt,
          name: attempt.user.name,
          score: attempt.score,
          total: attempt.total,
        };
      }),
    ).sort((left, right) => right.completedAt.getTime() - left.completedAt.getTime());
    const rankings = [...memberStats.values()]
      .map((entry) => ({
        ...entry,
        accuracy: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0,
        rating: entry.correct * 10 + entry.completed * 20 + entry.streak * 15,
      }))
      .sort((left, right) => right.rating - left.rating || right.accuracy - left.accuracy)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const totalAttempts = rankings.reduce((total, member) => total + member.completed, 0);
    const totalQuestions = rankings.reduce((total, member) => total + member.total, 0);
    const correctAnswers = rankings.reduce((total, member) => total + member.correct, 0);

    return NextResponse.json({
      team: {
        ...team,
        invitations: "invitations" in team ? team.invitations : [],
        role: membership.role,
        canManage,
        stats: {
          accuracy: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
          challenges: team.challenges.length,
          members: team.members.length,
          submissions: totalAttempts,
        },
        rankings,
        recentActivity: activity.slice(0, 8),
        quizzes,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
