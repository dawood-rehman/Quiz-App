import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, "ok" | "missing" | "unreachable"> = {
    database: "unreachable",
    jwtSecret: "missing",
    databaseUrl: "missing",
    email: "missing",
  };

  try {
    const env = getEnv();
    checks.databaseUrl = env.DATABASE_URL ? "ok" : "missing";
    checks.jwtSecret = env.JWT_SECRET ? "ok" : "missing";
    checks.email =
      env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && !/@example\.com>?$/i.test(env.EMAIL_FROM.trim())
        ? "ok"
        : "missing";
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "unreachable";
  }

  const healthy = checks.database === "ok" && checks.jwtSecret === "ok" && checks.databaseUrl === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
