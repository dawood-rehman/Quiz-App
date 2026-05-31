import Link from "next/link";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="page-state" id="main-content">
      <Logo />
      <div className="page-state-card">
        <span className="feature-icon"><Icon name="search" /></span>
        <p className="eyebrow">404 - Page not found</p>
        <h1>This page is off the learning path.</h1>
        <p>Head back home and choose your next topic from there.</p>
        <Link className="button button-primary" href="/">Back to home <Icon name="arrow" /></Link>
      </div>
    </main>
  );
}
