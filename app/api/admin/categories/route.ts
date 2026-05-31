import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError, parseJson } from "@/lib/http";
import { categorySchema } from "@/lib/quiz/schemas";
import { assertTrustedOrigin } from "@/lib/security/csrf";

export async function GET() {
  try {
    await requireUser("ADMIN");
    return NextResponse.json({ categories: await db.category.findMany({ orderBy: { name: "asc" } }) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireUser("ADMIN");
    const data = await parseJson(request, categorySchema);
    const category = await db.category.create({ data });
    await db.activityLog.create({ data: { userId: admin.id, action: "ADMIN_CREATED_CATEGORY", entity: "Category", entityId: category.id } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
