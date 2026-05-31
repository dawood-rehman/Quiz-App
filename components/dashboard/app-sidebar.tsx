"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppShell } from "@/components/dashboard/app-shell";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

const learnerItems = [
  ["dashboard", "Overview", "/dashboard"],
  ["grid", "My library", "/dashboard#library"],
  ["sparkles", "AI quiz studio", "/dashboard#studio"],
  ["chart", "My progress", "/dashboard#progress"],
  ["users", "Teams", "/teams"],
  ["settings", "Settings", "/settings"],
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppSidebar({
  admin = false,
  onLogout,
  user,
}: {
  admin?: boolean;
  onLogout: () => void | Promise<void>;
  user?: { name: string; email: string };
}) {
  const pathname = usePathname();
  const { closeMobileSidebar, collapsed, toggleSidebar } = useAppShell();
  const [hash, setHash] = useState("");

  const items = admin
    ? [
        ["dashboard", "Overview", "/admin"],
        ["users", "Users", "/admin#users"],
        ["grid", "Quiz catalog", "/admin#quizzes"],
        ["activity", "Monitoring", "/admin#monitoring"],
        ["settings", "Settings", "/settings"],
      ] as const
    : learnerItems;

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  function handleNavClick() {
    closeMobileSidebar();
  }

  return (
    <aside aria-label={admin ? "Admin navigation" : "Learner navigation"} className="app-sidebar" id="app-sidebar">
      <div className="sidebar-header">
        <Logo />
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-collapse-toggle"
          onClick={toggleSidebar}
          type="button"
        >
          <Icon name="menu" />
        </button>
      </div>

      {user && (
        <Link
          className="sidebar-account"
          href="/settings"
          onClick={handleNavClick}
          title={collapsed ? user.name : undefined}
        >
          <span className="sidebar-account-avatar">{getInitials(user.name)}</span>
          <span className="sidebar-account-copy">
            <strong>{user.name}</strong>
            <small>Account settings</small>
          </span>
        </Link>
      )}

      <nav>
        <p>{admin ? "Administration" : "Learn"}</p>
        {items.map(([icon, label, href]) => {
          const [itemPath, itemHash = ""] = href.split("#");
          const isActive = pathname === itemPath && hash === (itemHash ? `#${itemHash}` : "");
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "active" : ""}
              href={href}
              key={label}
              onClick={handleNavClick}
              title={collapsed ? label : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {!admin && (
        <div className="sidebar-upgrade">
          <Icon name="sparkles" />
          <strong>Keep your streak alive</strong>
          <p>A ten-minute session is all it takes.</p>
          <Link href="/dashboard#studio" onClick={handleNavClick}>
            Create a quiz
          </Link>
        </div>
      )}

      <div className="sidebar-footer">
        <Link
          className="sidebar-bottom"
          href={admin ? "/dashboard" : "/"}
          onClick={handleNavClick}
          title={collapsed ? (admin ? "Learner view" : "Back to site") : undefined}
        >
          <Icon name="arrow" />
          <span>{admin ? "Learner view" : "Back to site"}</span>
        </Link>
        <button
          className="sidebar-bottom sidebar-logout"
          onClick={() => {
            handleNavClick();
            void onLogout();
          }}
          title={collapsed ? "Log out" : undefined}
          type="button"
        >
          <Icon name="lock" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
