"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { useToast, type ToastTone } from "@/components/toast-provider";

type Mode = "login" | "signup" | "forgot" | "reset";

const content = {
  login: ["Welcome back", "Pick up your learning momentum right where you left off.", "Log in"],
  signup: ["Start learning smarter", "Create your account and turn any topic into a clear next step.", "Create account"],
  forgot: ["Reset your password", "Enter your email and we will send a secure reset link.", "Send reset link"],
  reset: ["Choose a new password", "Use a strong password you have not used anywhere else.", "Reset password"],
} as const;

export function AuthForm({ initialEmail, mode, notice, noticeTone = "success", token }: { initialEmail?: string; mode: Mode; notice?: string; noticeTone?: ToastTone; token?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();

  useEffect(() => {
    if (notice) toast({ message: notice, tone: noticeTone });
  }, [notice, noticeTone, toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    const values = Object.fromEntries(new FormData(form));
    const endpoint = mode === "signup" ? "register" : mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : "login";
    const payload = mode === "reset" ? { ...values, token } : values;

    try {
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { message?: string; verificationUrl?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Something went wrong.");

      if (mode === "login") {
        toast({ message: "Welcome back. Your dashboard is ready.", tone: "success" });
        router.replace("/dashboard");
        router.refresh();
      } else if (mode === "signup") {
        form.reset();
        toast({
          action: body.verificationUrl ? { href: body.verificationUrl, label: "Verify development account" } : undefined,
          message: body.message ?? "Account created. Check your email to verify your account.",
          tone: "success",
        });
        router.replace("/login");
      } else if (mode === "reset") {
        toast({ message: body.message ?? "Password reset. Log in with your new password.", tone: "success" });
        router.replace("/login");
      } else {
        toast({ message: body.message ?? "Check your inbox for the next step.", tone: "info" });
        form.reset();
      }
    } catch (caught) {
      toast({ message: caught instanceof Error ? caught.message : "Something went wrong.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  const [title, description, submitLabel] = content[mode];
  return (
    <div className="auth-card">
      <p className="eyebrow"><Icon name={mode === "login" ? "lock" : "sparkles"} /> Secure access</p>
      <h1>{title}</h1>
      <p className="auth-intro">{description}</p>
      <form aria-busy={loading} className="auth-form" onInvalid={() => toast({ message: "Please check the highlighted fields and try again.", tone: "warning" })} onSubmit={handleSubmit}>
        {mode === "signup" && <label>Full name<input autoComplete="name" name="name" placeholder="Maya Richardson" required type="text" /></label>}
        {mode !== "reset" && <label>Email address<input autoComplete="email" defaultValue={initialEmail} name="email" placeholder="you@example.com" required type="email" /></label>}
        {(mode === "login" || mode === "signup" || mode === "reset") && <div className="password-group"><label htmlFor={passwordId}>{mode === "reset" ? "New password" : "Password"}</label><span className="password-field"><input autoComplete={mode === "login" ? "current-password" : "new-password"} id={passwordId} minLength={mode === "login" ? 1 : 12} name="password" placeholder="At least 12 characters" required type={showPassword ? "text" : "password"} /><button aria-label={`${showPassword ? "Hide" : "Show"} password`} aria-controls={passwordId} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} type="button"><Icon name={showPassword ? "eyeOff" : "eye"} /></button></span></div>}
        {(mode === "signup" || mode === "reset") && <p className="password-hint">Use 12+ characters with uppercase, lowercase, a number, and a symbol.</p>}
        {mode === "login" && <div className="form-meta"><span>Secure session on this device</span><Link href="/forgot-password">Forgot password?</Link></div>}
        <button className="button button-primary button-full" disabled={loading} type="submit">{loading ? "Working..." : submitLabel}<Icon name="arrow" /></button>
      </form>
      <p className="auth-switch">
        {mode === "login" && <>New to QuizForge? <Link href="/signup">Create an account</Link></>}
        {mode === "signup" && <>Already learning with us? <Link href="/login">Log in</Link></>}
        {(mode === "forgot" || mode === "reset") && <Link href="/login">Back to login</Link>}
      </p>
    </div>
  );
}
