import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeTimezone(value?: string) {
  if (!value || value.length > 80) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return "UTC";
  }
}

export function getDayKey(date = new Date(), timezone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: normalizeTimezone(timezone),
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftDayKey(dayKey: string, days: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

function dayDistance(left: string, right: string) {
  const [leftYear, leftMonth, leftDay] = left.split("-").map(Number);
  const [rightYear, rightMonth, rightDay] = right.split("-").map(Number);
  return Math.round(
    (Date.UTC(leftYear, leftMonth - 1, leftDay) - Date.UTC(rightYear, rightMonth - 1, rightDay)) / DAY_MS,
  );
}

export function calculateStreak(dayKeys: string[], timezone = "UTC", now = new Date()) {
  const days = [...new Set(dayKeys)].sort();
  let longest = 0;
  let run = 0;
  let previous: string | undefined;

  for (const day of days) {
    run = previous && dayDistance(day, previous) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const today = getDayKey(now, timezone);
  const lastActiveDay = days.at(-1);
  if (!lastActiveDay || dayDistance(today, lastActiveDay) > 1) {
    return { current: 0, longest, lastActiveDay: lastActiveDay ?? null };
  }

  let current = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (dayDistance(days[index], days[index - 1]) !== 1) break;
    current += 1;
  }
  return { current, longest, lastActiveDay };
}

function scorePercent(score: number, total: number) {
  return total ? Math.round((score / total) * 100) : 0;
}

export function getPerformanceRating(progress: {
  bestScorePercent: number;
  correctAnswers: number;
  currentStreak: number;
  quizzesCompleted: number;
}) {
  return progress.correctAnswers * 10
    + progress.quizzesCompleted * 20
    + progress.bestScorePercent * 2
    + progress.currentStreak * 15;
}

export async function syncUserProgress(userId: string, timezone?: string) {
  const [user, attempts, activityDays] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
    db.quizAttempt.findMany({
      where: { userId },
      select: { durationSeconds: true, score: true, total: true },
    }),
    db.userActivityDay.findMany({ where: { userId }, select: { dayKey: true } }),
  ]);
  const resolvedTimezone = normalizeTimezone(timezone ?? user.timezone);
  const totalQuestions = attempts.reduce((total, attempt) => total + attempt.total, 0);
  const correctAnswers = attempts.reduce((total, attempt) => total + attempt.score, 0);
  const streak = calculateStreak(activityDays.map((entry) => entry.dayKey), resolvedTimezone);

  if (resolvedTimezone !== user.timezone) {
    await db.user.update({ where: { id: userId }, data: { timezone: resolvedTimezone } });
  }

  return db.userProgress.upsert({
    where: { userId },
    create: {
      userId,
      quizzesCompleted: attempts.length,
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      totalDurationSeconds: attempts.reduce((total, attempt) => total + attempt.durationSeconds, 0),
      bestScorePercent: attempts.reduce((best, attempt) => Math.max(best, scorePercent(attempt.score, attempt.total)), 0),
      currentStreak: streak.current,
      longestStreak: streak.longest,
      lastActiveDay: streak.lastActiveDay,
    },
    update: {
      quizzesCompleted: attempts.length,
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      totalDurationSeconds: attempts.reduce((total, attempt) => total + attempt.durationSeconds, 0),
      bestScorePercent: attempts.reduce((best, attempt) => Math.max(best, scorePercent(attempt.score, attempt.total)), 0),
      currentStreak: streak.current,
      longestStreak: streak.longest,
      lastActiveDay: streak.lastActiveDay,
    },
  });
}

export async function recordActivityDay(userId: string, timezone?: string, completedAt = new Date()) {
  const resolvedTimezone = normalizeTimezone(timezone);
  await db.userActivityDay.upsert({
    where: { userId_dayKey: { userId, dayKey: getDayKey(completedAt, resolvedTimezone) } },
    create: { userId, dayKey: getDayKey(completedAt, resolvedTimezone), timezone: resolvedTimezone, completedAt },
    update: {},
  });
  return syncUserProgress(userId, resolvedTimezone);
}

export async function getLeaderboard(userId: string, limit = 10) {
  const rows = await db.userProgress.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ correctAnswers: "desc" }, { quizzesCompleted: "desc" }, { bestScorePercent: "desc" }],
    take: 500,
  });
  const ranked = rows
    .map((entry) => ({
      userId: entry.userId,
      name: entry.user.name,
      quizzesCompleted: entry.quizzesCompleted,
      accuracy: entry.totalQuestions ? Math.round((entry.correctAnswers / entry.totalQuestions) * 100) : 0,
      currentStreak: entry.currentStreak,
      rating: getPerformanceRating(entry),
    }))
    .sort((left, right) => right.rating - left.rating || right.accuracy - left.accuracy)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    leaders: ranked.slice(0, limit),
    rank: ranked.find((entry) => entry.userId === userId)?.rank ?? null,
    rating: ranked.find((entry) => entry.userId === userId)?.rating ?? 0,
  };
}

export async function buildUserInsights(userId: string, timezone?: string) {
  const resolvedTimezone = normalizeTimezone(timezone);
  const progress = await syncUserProgress(userId, resolvedTimezone);
  const today = getDayKey(new Date(), resolvedTimezone);
  const trendDays = Array.from({ length: 7 }, (_, index) => shiftDayKey(today, index - 6));
  const trendStart = new Date(`${shiftDayKey(today, -7)}T00:00:00.000Z`);
  const [recentAttempts, trendAttempts, topicAttempts, leaderboard] = await Promise.all([
    db.quizAttempt.findMany({
      where: { userId },
      select: {
        completedAt: true,
        durationSeconds: true,
        id: true,
        quiz: { select: { id: true, title: true, topic: true } },
        score: true,
        total: true,
      },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
    db.quizAttempt.findMany({
      where: { completedAt: { gte: trendStart }, userId },
      select: { completedAt: true, score: true, total: true },
    }),
    db.quizAttempt.findMany({
      where: { userId },
      select: { quiz: { select: { topic: true } }, score: true, total: true },
    }),
    getLeaderboard(userId, 5),
  ]);
  const topicMap = new Map<string, { correct: number; total: number; quizzes: number }>();
  for (const attempt of topicAttempts) {
    const entry = topicMap.get(attempt.quiz.topic) ?? { correct: 0, quizzes: 0, total: 0 };
    entry.correct += attempt.score;
    entry.quizzes += 1;
    entry.total += attempt.total;
    topicMap.set(attempt.quiz.topic, entry);
  }
  const topicPerformance = [...topicMap.entries()]
    .map(([topic, value]) => ({ ...value, accuracy: scorePercent(value.correct, value.total), topic }))
    .sort((left, right) => right.accuracy - left.accuracy);
  const activity = trendDays.map((dayKey) => {
    const attempts = trendAttempts.filter((attempt) => getDayKey(attempt.completedAt, resolvedTimezone) === dayKey);
    const total = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
    const correct = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return { dayKey, quizzes: attempts.length, accuracy: scorePercent(correct, total) };
  });
  const weakestTopic = [...topicPerformance].sort((left, right) => left.accuracy - right.accuracy)[0];

  return {
    metrics: {
      completed: progress.quizzesCompleted,
      totalQuestions: progress.totalQuestions,
      correctAnswers: progress.correctAnswers,
      incorrectAnswers: progress.incorrectAnswers,
      averageScore: progress.totalQuestions ? Math.round((progress.correctAnswers / progress.totalQuestions) * 100) : 0,
      bestScore: progress.bestScorePercent,
      accuracy: progress.totalQuestions ? Math.round((progress.correctAnswers / progress.totalQuestions) * 100) : 0,
      learningSeconds: progress.totalDurationSeconds,
    },
    streak: {
      current: progress.currentStreak,
      longest: progress.longestStreak,
      lastActiveDate: progress.lastActiveDay,
    },
    activity,
    topicPerformance,
    quizHistory: recentAttempts.map((attempt) => ({
      ...attempt,
      accuracy: scorePercent(attempt.score, attempt.total),
    })),
    achievements: [
      ...(progress.quizzesCompleted >= 1 ? [{ label: "First quiz", description: "Completed your first learning session." }] : []),
      ...(progress.currentStreak >= 3 ? [{ label: "On a roll", description: "Maintained a three-day learning streak." }] : []),
      ...(progress.bestScorePercent === 100 ? [{ label: "Perfect score", description: "Answered every question correctly in a quiz." }] : []),
    ],
    rank: leaderboard.rank,
    rating: leaderboard.rating,
    recommendation: weakestTopic
      ? `Focus your next session on ${weakestTopic.topic}. Your current accuracy is ${weakestTopic.accuracy}%.`
      : "Complete your first quiz to unlock a personalized recommendation.",
  };
}
