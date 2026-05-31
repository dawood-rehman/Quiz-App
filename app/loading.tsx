import { Logo } from "@/components/logo";

export default function Loading() {
  return (
    <main className="page-state" id="main-content">
      <Logo />
      <div aria-label="Loading content" className="page-state-card" role="status">
        <span className="skeleton state-line state-line-short" />
        <span className="skeleton state-line state-line-title" />
        <span className="skeleton state-line" />
        <span className="skeleton state-line" />
      </div>
    </main>
  );
}
