import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai/openrouter";
import { quizGenerationInputSchema } from "@/lib/ai/schemas";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { getClientIp, jsonError, parseJson } from "@/lib/http";
import { assertTrustedOrigin } from "@/lib/security/csrf";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { prepareWorkspaceCollaborators } from "@/lib/teams/quiz-collaboration";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    assertRateLimit(`ai:${user.id}:${getClientIp(request)}`, 10, 60 * 60 * 1000);
    const input = await parseJson(request, quizGenerationInputSchema);
    const generated = await generateQuiz(input, user.id);
    const collaborators = input.workspaceId
      ? await prepareWorkspaceCollaborators({ collaboratorUserIds: input.collaboratorUserIds, managerId: user.id, teamId: input.workspaceId })
      : [];
    const quiz = await db.quiz.create({
      data: {
        title: generated.title,
        description: generated.description,
        topic: generated.topic,
        difficulty: generated.difficulty,
        isAIGenerated: true,
        status: "PUBLISHED",
        authorId: user.id,
        teamId: input.workspaceId,
        collaborators: { create: collaborators },
        questions: {
          create: generated.questions.map((question, questionIndex) => ({
            prompt: question.prompt,
            explanation: question.explanation,
            position: questionIndex,
            options: {
              create: question.options.map((option, optionIndex) => ({ ...option, position: optionIndex })),
            },
          })),
        },
      },
      include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
    });
    if (input.workspaceId && input.pendingCollaboratorEmails.length) {
      await db.teamInvitation.updateMany({
        where: {
          email: { in: input.pendingCollaboratorEmails },
          status: "PENDING",
          teamId: input.workspaceId,
        },
        data: { quizId: quiz.id, quizRole: "EDITOR" },
      });
    }
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
