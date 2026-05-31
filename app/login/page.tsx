import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; session?: string; verified?: string; workspaces?: string; registered?: string; email?: string }>;
}) {
  const params = await searchParams;
  const notice = params.verified === "true"
    ? `Email verified${params.workspaces ? " and workspace access granted" : ""}. You can log in now.`
    : params.registered === "1"
      ? `We sent a verification link to ${params.email ? decodeURIComponent(params.email) : "your email"}. Open it to verify your account before signing in.`
      : params.reset === "true"
        ? "Password reset. Log in with your new password."
        : params.session === "expired"
          ? "Your session expired. Log in again to continue."
          : undefined;
  const noticeTone = params.session === "expired" ? "warning" : params.registered === "1" ? "info" : "success";

  return <AuthShell><AuthForm mode="login" notice={notice} noticeTone={noticeTone} /></AuthShell>;
}
