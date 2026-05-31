import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ email?: string; invitation?: string }> }) {
  const { email, invitation } = await searchParams;
  return <AuthShell><AuthForm initialEmail={email} mode="signup" notice={invitation ? "Create your account and verify your email to join the workspace." : undefined} noticeTone="info" /></AuthShell>;
}
