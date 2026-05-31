import { z } from "zod";
import { emailSchema } from "@/lib/auth/schemas";

export const createTeamSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).optional(),
});

export const updateTeamSchema = createTeamSchema;

export const inviteTeamMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  quizId: z.string().cuid().optional(),
  quizRole: z.enum(["MANAGER", "EDITOR", "VIEWER"]).optional(),
});

export const respondToInvitationSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export const createTeamChallengeSchema = z.object({
  quizId: z.string().cuid(),
  title: z.string().trim().min(3).max(100),
  deadline: z.iso.datetime().optional(),
  collaboratorUserIds: z.array(z.string().cuid()).min(1, "Select at least one collaborator."),
});

export const respondToChallengeInvitationSchema = respondToInvitationSchema;

export const updateTeamMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const updateQuizCollaboratorsSchema = z.object({
  collaborators: z.array(z.object({
    userId: z.string().cuid(),
    role: z.enum(["MANAGER", "EDITOR", "VIEWER"]),
  })).max(100),
});
