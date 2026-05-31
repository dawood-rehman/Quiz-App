import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page" id="main-content">
      <section className="auth-brand">
        <Logo />
        <div className="auth-quote">
          <span className="feature-icon"><Icon name="sparkles" /></span>
          <blockquote>&ldquo;The best learning plan is the one that knows what you need next.&rdquo;</blockquote>
          <p>Adaptive practice. Clear progress. Better momentum.</p>
        </div>
        <small>&copy; 2026 QuizForge</small>
      </section>
      <section className="auth-panel">
        <div className="auth-mobile-header"><Logo /></div>
        {children}
      </section>
    </main>
  );
}
