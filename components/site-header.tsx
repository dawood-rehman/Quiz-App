import Link from "next/link";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

const navItems = [
  ["Features", "#features"],
  ["How it works", "#workflow"],
  ["Insights", "#insights"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav aria-label="Main navigation" className="landing-nav">
          {navItems.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
        </nav>
        <div className="header-actions">
          <Link className="text-button" href="/login">Log in</Link>
          <Link className="button button-primary button-small header-cta" href="/signup">Start learning</Link>
          <details className="mobile-nav">
            <summary aria-label="Open navigation menu"><Icon name="menu" /></summary>
            <nav aria-label="Mobile navigation">
              {navItems.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
              <Link href="/login">Log in</Link>
              <Link className="mobile-menu-cta" href="/signup">Start learning free</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
