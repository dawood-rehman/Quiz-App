import { z } from "zod";

export const submitAttemptSchema = z.object({
  quizId: z.string().cuid(),
  teamChallengeId: z.string().cuid().optional(),
  durationSeconds: z.number().int().min(0).max(24 * 60 * 60).default(0),
  timezone: z.string().trim().min(1).max(80).default("UTC"),
  answers: z
    .array(z.object({ questionId: z.string().cuid(), optionId: z.string().cuid() }))
    .min(1)
    .max(50),
});

const optionSchema = z.object({ label: z.string().trim().min(1).max(240), isCorrect: z.boolean() });
const questionSchema = z.object({
  prompt: z.string().trim().min(5).max(400),
  explanation: z.string().trim().min(10).max(700),
  options: z
    .array(optionSchema)
    .length(4)
    .refine((options) => options.filter((option) => option.isCorrect).length === 1, "Use exactly one correct answer."),
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(240).optional(),
  topic: z.string().trim().min(3).max(80),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ADAPTIVE"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  categoryId: z.string().cuid().optional(),
  questions: z.array(questionSchema).min(1).max(50),
});

export const updateQuizSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  topic: z.string().trim().min(3).max(80).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ADAPTIVE"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: z.string().cuid().nullable().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(70),
  description: z.string().trim().max(240).optional(),
});
