"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";

export function AccountActions({
  user,
  onLogout,
}: {
  user?: { name: string };
  onLogout: () => void;
}) {
  const initials =
    user?.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "QF";

  return (
    <div className="dashboard-actions">
      <Link aria-label="Account settings" className="icon-button" href="/settings">
        <Icon name="settings" />
      </Link>
      <Link aria-label="Open account settings" className="profile-button" href="/settings">
        <span>{initials}</span>
        <div>
          <strong>{user?.name ?? "Your account"}</strong>
          <small>Settings</small>
        </div>
      </Link>
      <button className="button button-quiet button-small account-logout" onClick={onLogout} type="button">
        Log out
      </button>
    </div>
  );
}
