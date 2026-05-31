"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { useAppShell } from "@/components/dashboard/app-shell";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

const learnerLinks = [
  ["dashboard", "Overview", "/dashboard"],
  ["grid", "My library", "/dashboard#library"],
  ["sparkles", "AI quiz studio", "/dashboard#studio"],
  ["chart", "My progress", "/dashboard#progress"],
  ["users", "Teams", "/teams"],
  ["settings", "Settings", "/settings"],
] as const;

const adminLinks = [
  ["dashboard", "Overview", "/admin"],
  ["users", "Users", "/admin#users"],
  ["grid", "Quiz catalog", "/admin#quizzes"],
  ["activity", "Monitoring", "/admin#monitoring"],
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
  const links = admin ? adminLinks : learnerLinks;

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  function handleNavClick() {
    closeMobileSidebar();
  }

  function renderNavItem([icon, label, href]: readonly [string, string, string]) {
    const [itemPath, itemHash = ""] = href.split("#");
    const isActive = pathname === itemPath && hash === (itemHash ? `#${itemHash}` : "");

    return (
      <Link
        aria-current={isActive ? "page" : undefined}
        className={`sidebar-nav-item${isActive ? " active" : ""}`}
        href={href}
        key={label}
        onClick={handleNavClick}
        title={collapsed ? label : undefined}
      >
        <Icon name={icon as ComponentProps<typeof Icon>["name"]} />
        <span>{label}</span>
      </Link>
    );
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

      <div className="sidebar-body">
        <nav className="sidebar-nav" aria-label={admin ? "Administration" : "Learn"}>
          <p className="sidebar-section-label">{admin ? "Administration" : "Learn"}</p>
          {links.map((item) => renderNavItem(item))}
          <button
            className="sidebar-nav-item sidebar-logout"
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

        {admin && (
          <Link
            className="sidebar-nav-item sidebar-learner-link"
            href="/dashboard"
            onClick={handleNavClick}
            title={collapsed ? "Learner view" : undefined}
          >
            <Icon name="arrow" />
            <span>Learner view</span>
          </Link>
        )}
      </div>

      {user && (
        <div className="sidebar-user">
          <span className="sidebar-user-avatar" aria-hidden="true">
            {getInitials(user.name)}
          </span>
          <div className="sidebar-user-copy">
            <span className="sidebar-user-label">Signed in as</span>
            <strong>{user.name}</strong>
          </div>
        </div>
      )}
    </aside>
  );
}
