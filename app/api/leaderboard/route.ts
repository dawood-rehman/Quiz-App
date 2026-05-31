import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/analytics/progress";
import { requireUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getLeaderboard(user.id));
  } catch (error) {
    return jsonError(error);
  }
}
