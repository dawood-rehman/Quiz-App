import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { jsonError, parseJson } from "@/lib/http";
import { updateQuizSchema } from "@/lib/quiz/schemas";
import { assertTrustedOrigin } from "@/lib/security/csrf";

export async function PATCH(request: Request, context: { params: Promise<{ quizId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireUser("ADMIN");
    const { quizId } = await context.params;
    const data = await parseJson(request, updateQuizSchema);
    const quiz = await db.quiz.update({ where: { id: quizId }, data });
    await db.activityLog.create({ data: { userId: admin.id, action: "ADMIN_UPDATED_QUIZ", entity: "Quiz", entityId: quizId, metadata: data } });
    return NextResponse.json({ quiz });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ quizId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireUser("ADMIN");
    const { quizId } = await context.params;
    await db.quiz.delete({ where: { id: quizId } });
    await db.activityLog.create({ data: { userId: admin.id, action: "ADMIN_DELETED_QUIZ", entity: "Quiz", entityId: quizId } });
    return NextResponse.json({ message: "Quiz deleted." });
  } catch (error) {
    return jsonError(error);
  }
}
