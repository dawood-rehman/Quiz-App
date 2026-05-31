"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { authenticatedFetch } from "@/lib/client/authenticated-fetch";
import { useToast } from "@/components/toast-provider";

type AppShellContextValue = {
  closeMobileSidebar: () => void;
  collapsed: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within AppShell.");
  }
  return context;
}

const SIDEBAR_STORAGE_KEY = "quizforge-sidebar-collapsed";

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
}

export function AppShell({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string }>();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  useEffect(() => {
    authenticatedFetch("/api/auth/me")
      .then(async (response) => {
        const payload = (await response.json()) as { user?: { name: string; email: string } };
        if (response.ok && payload.user) setUser(payload.user);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-mobile-open", mobileOpen);
    return () => document.body.classList.remove("sidebar-mobile-open");
  }, [mobileOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);

  const toggleSidebar = useCallback(() => {
    if (isMobileViewport()) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage access errors.
      }
      return next;
    });
  }, []);

  const logOut = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Logout failed.");
      toast({ message: "You have been logged out securely.", tone: "success" });
      router.replace("/");
      router.refresh();
    } catch {
      toast({ message: "You could not be logged out. Please try again.", tone: "error" });
    }
  }, [router, toast]);

  const value = useMemo(
    () => ({ closeMobileSidebar, collapsed, mobileOpen, toggleSidebar }),
    [closeMobileSidebar, collapsed, mobileOpen, toggleSidebar],
  );

  return (
    <AppShellContext.Provider value={value}>
      <div
        className={`app-layout${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}
      >
        <button
          aria-label="Close navigation menu"
          className="sidebar-overlay"
          onClick={closeMobileSidebar}
          type="button"
        />
        <AppSidebar admin={admin} onLogout={logOut} user={user} />
        <div className="app-content" id="main-content">
          {children}
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
