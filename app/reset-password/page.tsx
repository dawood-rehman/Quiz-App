import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthShell>
        <div className="auth-card">
          <p className="eyebrow">Secure access</p>
          <h1>Reset link missing</h1>
          <p className="auth-intro">Request a fresh password reset link so we can verify your account securely.</p>
          <Link className="button button-primary button-full" href="/forgot-password">Request reset link</Link>
        </div>
      </AuthShell>
    );
  }
  return <AuthShell><AuthForm mode="reset" token={token} /></AuthShell>;
}
