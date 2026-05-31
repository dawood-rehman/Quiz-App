"use client";

import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-state" id="main-content">
      <Logo />
      <div className="page-state-card">
        <span className="feature-icon"><Icon name="activity" /></span>
        <p className="eyebrow">Something went wrong</p>
        <h1>That page needs another try.</h1>
        <p>Your progress is safe. Refresh this view and pick up where you left off.</p>
        <button className="button button-primary" onClick={reset}>Try again <Icon name="arrow" /></button>
      </div>
    </main>
  );
}
