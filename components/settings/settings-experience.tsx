"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AccountActions } from "@/components/dashboard/account-actions";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast-provider";
import { authenticatedFetch } from "@/lib/client/authenticated-fetch";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerifiedAt: string | null;
};

export function SettingsExperience() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>();
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const currentPasswordId = useId();
  const newPasswordId = useId();

  useEffect(() => {
    authenticatedFetch("/api/auth/me")
      .then(async (response) => {
        const payload = (await response.json()) as { user?: Profile; error?: { message?: string } };
        if (!response.ok || !payload.user) throw new Error(payload.error?.message ?? "Your profile could not be loaded.");
        setProfile(payload.user);
      })
      .catch((error) => {
        toast({
          message: error instanceof Error ? error.message : "Your profile could not be loaded.",
          tone: "error",
        });
      });
  }, [toast]);

  async function logOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("You could not be logged out. Please try again.");
      toast({ message: "You have been logged out securely.", tone: "success" });
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : "You could not be logged out. Please try again.",
        tone: "error",
      });
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setProfileBusy(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));

    try {
      const response = await authenticatedFetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, email: values.email }),
      });
      const payload = (await response.json()) as {
        message?: string;
        user?: Profile;
        verificationSent?: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.user) throw new Error(payload.error?.message ?? "Profile could not be updated.");

      setProfile(payload.user);
      toast({
        message: payload.message ?? "Profile updated.",
        tone: payload.verificationSent ? "info" : "success",
        title: payload.verificationSent ? "Verify your email" : "Profile saved",
        duration: payload.verificationSent ? 12_000 : undefined,
      });
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : "Profile could not be updated.",
        tone: "error",
      });
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));

    if (values.newPassword !== values.confirmPassword) {
      toast({ message: "New password and confirmation do not match.", tone: "warning" });
      setPasswordBusy(false);
      return;
    }

    try {
      const response = await authenticatedFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const payload = (await response.json()) as { message?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Password could not be changed.");

      toast({ message: payload.message ?? "Password changed. Sign in again.", tone: "success" });
      router.replace("/login?session=expired");
      router.refresh();
    } catch (error) {
      toast({
        message: error instanceof Error ? error.message : "Password could not be changed.",
        tone: "error",
      });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <main className="app-layout" id="main-content">
      <AppSidebar />
      <section className="dashboard-main settings-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">
              <Icon name="settings" /> Account
            </p>
            <h1>Settings</h1>
            <span>Update your profile, email, and password.</span>
          </div>
          <AccountActions onLogout={logOut} user={profile} />
        </header>

        <div className="settings-grid">
          <section className="library-card settings-card">
            <div className="section-row">
              <div>
                <p className="eyebrow">Profile</p>
                <h2>Name and email</h2>
              </div>
              {profile && (
                <span className={`status-pill ${profile.emailVerifiedAt ? "published" : ""}`}>
                  {profile.emailVerifiedAt ? "Email verified" : "Email not verified"}
                </span>
              )}
            </div>
            {!profile && <p className="empty-copy">Loading your profile...</p>}
            {profile && (
              <form className="auth-form settings-form" onSubmit={saveProfile}>
                <label>
                  Full name
                  <input defaultValue={profile.name} key={`name-${profile.name}`} name="name" required type="text" />
                </label>
                <label>
                  Email address
                  <input
                    autoComplete="email"
                    defaultValue={profile.email}
                    key={`email-${profile.email}`}
                    name="email"
                    required
                    type="email"
                  />
                </label>
                {!profile.emailVerifiedAt && (
                  <p className="password-hint">
                    Your email is not verified yet. Check your inbox for the verification link or register again if needed.
                  </p>
                )}
                <button className="button button-primary" disabled={profileBusy} type="submit">
                  {profileBusy ? "Saving..." : "Save profile"}
                </button>
              </form>
            )}
          </section>

          <section className="library-card settings-card">
            <div className="section-row">
              <div>
                <p className="eyebrow">Security</p>
                <h2>Change password</h2>
              </div>
            </div>
            <form className="auth-form settings-form" onSubmit={changePassword}>
              <div className="password-group">
                <label htmlFor={currentPasswordId}>Current password</label>
                <span className="password-field">
                  <input
                    autoComplete="current-password"
                    id={currentPasswordId}
                    name="currentPassword"
                    required
                    type={showCurrentPassword ? "text" : "password"}
                  />
                  <button
                    aria-controls={currentPasswordId}
                    aria-label={`${showCurrentPassword ? "Hide" : "Show"} current password`}
                    aria-pressed={showCurrentPassword}
                    onClick={() => setShowCurrentPassword((visible) => !visible)}
                    type="button"
                  >
                    <Icon name={showCurrentPassword ? "eyeOff" : "eye"} />
                  </button>
                </span>
              </div>
              <div className="password-group">
                <label htmlFor={newPasswordId}>New password</label>
                <span className="password-field">
                  <input
                    autoComplete="new-password"
                    id={newPasswordId}
                    minLength={12}
                    name="newPassword"
                    required
                    type={showNewPassword ? "text" : "password"}
                  />
                  <button
                    aria-controls={newPasswordId}
                    aria-label={`${showNewPassword ? "Hide" : "Show"} new password`}
                    aria-pressed={showNewPassword}
                    onClick={() => setShowNewPassword((visible) => !visible)}
                    type="button"
                  >
                    <Icon name={showNewPassword ? "eyeOff" : "eye"} />
                  </button>
                </span>
              </div>
              <label>
                Confirm new password
                <input autoComplete="new-password" minLength={12} name="confirmPassword" required type="password" />
              </label>
              <p className="password-hint">Use 12+ characters with uppercase, lowercase, a number, and a symbol.</p>
              <button className="button button-primary" disabled={passwordBusy} type="submit">
                {passwordBusy ? "Updating..." : "Update password"}
              </button>
            </form>
          </section>
        </div>

        <p className="settings-back">
          <Link href="/dashboard">
            <Icon name="arrow" /> Back to dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}
