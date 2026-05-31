import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { buildUserInsights } from "@/lib/analytics/progress";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const timezone = new URL(request.url).searchParams.get("timezone") ?? undefined;
    return NextResponse.json(await buildUserInsights(user.id, timezone));
  } catch (error) {
    return jsonError(error);
  }
}
