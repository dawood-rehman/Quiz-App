import { z } from "zod";
import { passwordSchema } from "@/lib/security/password";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(100),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "Provide a name or email address to update.",
  });
