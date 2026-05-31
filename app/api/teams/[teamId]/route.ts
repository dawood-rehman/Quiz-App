import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { ApiError, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { requireWorkspaceManager } from "@/lib/teams/invitations";
import { updateTeamSchema } from "@/lib/teams/schemas";

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

    type MemberStat = {
      accuracy: number;
      completed: number;
      correct: number;
      durationSeconds: number;
      name: string;
      streak: number;
      total: number;
      userId: string;
    };

    const memberStats = new Map<string, MemberStat>(team.members.map((member) => [member.user.id, {
      accuracy: 0,
      completed: 0,
      correct: 0,
      durationSeconds: 0,
      name: member.user.name,
      streak: member.user.progress?.currentStreak ?? 0,
      total: 0,
      userId: member.user.id,
    }]));
    const activity = team.challenges.flatMap((challenge: { title: string; attempts: { user: { id: string; name: string }; completedAt: Date; durationSeconds: number; score: number; total: number }[] }) =>
      challenge.attempts.map((attempt: { user: { id: string; name: string }; completedAt: Date; durationSeconds: number; score: number; total: number }) => {
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
    ).sort((left: { completedAt: Date }, right: { completedAt: Date }) => right.completedAt.getTime() - left.completedAt.getTime());
    const rankings = [...memberStats.values()]
      .map((entry: MemberStat) => ({
        ...entry,
        accuracy: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0,
        rating: entry.correct * 10 + entry.completed * 20 + entry.streak * 15,
      }))
      .sort((left: MemberStat & { accuracy: number; rating: number }, right: MemberStat & { accuracy: number; rating: number }) => right.rating - left.rating || right.accuracy - left.accuracy)
      .map((entry: MemberStat & { accuracy: number; rating: number }, index: number) => ({ ...entry, rank: index + 1 }));
    const totalAttempts = rankings.reduce((total: number, member: MemberStat & { accuracy: number; rating: number; rank: number }) => total + member.completed, 0);
    const totalQuestions = rankings.reduce((total: number, member: MemberStat & { accuracy: number; rating: number; rank: number }) => total + member.total, 0);
    const correctAnswers = rankings.reduce((total: number, member: MemberStat & { accuracy: number; rating: number; rank: number }) => total + member.correct, 0);

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

export async function PATCH(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { teamId } = await context.params;
    await requireWorkspaceManager(user.id, teamId);
    const data = await parseJson(request, updateTeamSchema);

    const team = await db.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description?.trim() ? data.description : null,
      },
      select: { id: true, name: true, description: true },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "TEAM_UPDATED",
        entity: "Team",
        entityId: team.id,
        metadata: { name: team.name },
      },
    });

    return NextResponse.json({ team });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    assertTrustedOrigin(_request);
    const user = await requireUser();
    const { teamId } = await context.params;
    await requireWorkspaceManager(user.id, teamId);

    const team = await db.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
    if (!team) throw new ApiError(404, "Team not found.", "TEAM_NOT_FOUND");

    await db.team.delete({ where: { id: teamId } });
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "TEAM_DELETED",
        entity: "Team",
        entityId: team.id,
        metadata: { name: team.name },
      },
    });

    return NextResponse.json({ message: "Workspace deleted." });
  } catch (error) {
    return jsonError(error);
  }
}
