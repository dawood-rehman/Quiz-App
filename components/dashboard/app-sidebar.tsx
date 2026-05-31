"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

const learnerItems = [
  ["dashboard", "Overview", "/dashboard"],
  ["grid", "My library", "/dashboard#library"],
  ["sparkles", "AI quiz studio", "/dashboard#studio"],
  ["chart", "My progress", "/dashboard#progress"],
  ["users", "Teams", "/teams"],
] as const;

export function AppSidebar({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const items = admin
    ? [
        ["dashboard", "Overview", "/admin"],
        ["users", "Users", "/admin#users"],
        ["grid", "Quiz catalog", "/admin#quizzes"],
        ["activity", "Monitoring", "/admin#monitoring"],
      ] as const
    : learnerItems;

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return (
    <aside className="app-sidebar">
      <Logo />
      <nav aria-label={admin ? "Admin navigation" : "Learner navigation"}>
        <p>{admin ? "Administration" : "Learn"}</p>
        {items.map(([icon, label, href]) => {
          const [itemPath, itemHash = ""] = href.split("#");
          const isActive = pathname === itemPath && hash === (itemHash ? `#${itemHash}` : "");
          return <Link aria-current={isActive ? "page" : undefined} aria-label={label} className={isActive ? "active" : ""} href={href} key={label}><Icon name={icon} /><span>{label}</span></Link>;
        })}
      </nav>
      {!admin && <div className="sidebar-upgrade"><Icon name="sparkles" /><strong>Keep your streak alive</strong><p>A ten-minute session is all it takes.</p><a href="#studio">Create a quiz</a></div>}
      <Link aria-label={admin ? "Learner view" : "Back to site"} className="sidebar-bottom" href={admin ? "/dashboard" : "/"}><Icon name="arrow" /><span>{admin ? "Learner view" : "Back to site"}</span></Link>
    </aside>
  );
}
