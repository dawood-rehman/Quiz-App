import { z } from "zod";
import { emailSchema } from "@/lib/auth/schemas";

export const quizGenerationInputSchema = z.object({
  topic: z.string().trim().min(3).max(120),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ADAPTIVE"]).default("ADAPTIVE"),
  questionCount: z.number().int().min(3).max(10).default(5),
  workspaceId: z.string().cuid().optional(),
  collaboratorUserIds: z.array(z.string().cuid()).max(100).default([]),
  pendingCollaboratorEmails: z.array(emailSchema).max(100).default([]),
});

export const generatedQuizSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(240),
  topic: z.string().trim().min(3).max(120),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ADAPTIVE"]),
  questions: z.array(
    z.object({
      prompt: z.string().trim().min(5).max(400),
      explanation: z.string().trim().min(10).max(700),
      options: z
        .array(z.object({ label: z.string().trim().min(1).max(240), isCorrect: z.boolean() }))
        .length(4)
        .superRefine((options, context) => {
          if (options.filter((option) => option.isCorrect).length !== 1) {
            context.addIssue({ code: "custom", message: "Each question must have exactly one correct answer." });
          }
          if (new Set(options.map((option) => option.label.toLocaleLowerCase())).size !== options.length) {
            context.addIssue({ code: "custom", message: "Each question must have four distinct options." });
          }
        }),
    }),
  ).min(3).max(10),
});

export const performanceEvaluationSchema = z.object({
  summary: z.string().trim().min(10).max(500),
  suggestions: z.array(z.string().trim().min(5).max(240)).min(1).max(3),
  explanations: z.array(z.object({
    questionId: z.string().cuid(),
    explanation: z.string().trim().min(10).max(700),
  })).max(10),
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;
export type QuizGenerationInput = z.infer<typeof quizGenerationInputSchema>;
export type PerformanceEvaluation = z.infer<typeof performanceEvaluationSchema>;
