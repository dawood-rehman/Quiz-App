"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { useAppShell } from "@/components/dashboard/app-shell";

export function PageToolbar({ children }: { children: ReactNode }) {
  const { collapsed, mobileOpen, toggleSidebar } = useAppShell();

  return (
    <div className="page-toolbar">
      <button
        aria-controls="app-sidebar"
        aria-expanded={mobileOpen || !collapsed}
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        className="sidebar-toggle"
        onClick={toggleSidebar}
        type="button"
      >
        <Icon name={mobileOpen ? "close" : "menu"} />
      </button>
      <div className="page-toolbar-content">{children}</div>
    </div>
  );
}
