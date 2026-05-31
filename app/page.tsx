import Link from "next/link";
import { Icon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";

const features = [
  ["sparkles", "AI quiz studio", "Turn any topic into a focused practice set with teaching-first explanations."],
  ["target", "Adaptive difficulty", "Build confidence at the right pace as each session responds to your progress."],
  ["chart", "Actionable insights", "Know exactly what to review next with clear topic-level performance signals."],
] as const;

const topics = [
  ["Web Development", "24 quizzes", "82%", "linear-gradient(135deg, #d8f3ed, #b5e8dd)"],
  ["Data Science", "18 quizzes", "74%", "linear-gradient(135deg, #eee8ff, #d9cbff)"],
  ["Cybersecurity", "16 quizzes", "91%", "linear-gradient(135deg, #fff1d9, #ffe2b0)"],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow"><Icon name="sparkles" /> AI-powered adaptive learning</p>
            <h1>Master any topic.<br /><span>One smart quiz at a time.</span></h1>
            <p className="hero-text">QuizForge turns your curiosity into a personalized learning path with adaptive quizzes, instant explanations, and insights that keep every session focused.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/signup">Start learning free <Icon name="arrow" /></Link>
              <a className="button button-quiet" href="#workflow"><span className="play-icon"><Icon name="play" /></span> See how it works</a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true"><span>AK</span><span>ML</span><span>SR</span><span>+</span></div>
              <p><strong>4.9/5</strong><br /><span>Loved by 12,000+ learners</span></p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-orb hero-orb-one" />
            <div className="hero-orb hero-orb-two" />
            <div className="dashboard-preview">
              <div className="preview-sidebar">
                <span className="preview-logo"><Icon name="brain" /></span>
                <span className="active"><Icon name="dashboard" /></span>
                <span><Icon name="grid" /></span>
                <span><Icon name="chart" /></span>
              </div>
              <div className="preview-content">
                <div className="preview-top"><div><small>Good morning, Maya</small><strong>Ready to learn?</strong></div><span className="mini-avatar">MR</span></div>
                <div className="preview-progress">
                  <div><small>Weekly progress</small><strong>Keep it going!</strong><p>4 day learning streak</p></div>
                  <div className="progress-ring"><strong>72%</strong></div>
                </div>
                <small className="preview-label">Continue learning</small>
                <div className="preview-card"><span className="topic-icon purple"><Icon name="brain" /></span><div><strong>JavaScript essentials</strong><small>12 of 18 quizzes complete</small><i><b style={{ width: "66%" }} /></i></div><span className="round-arrow"><Icon name="arrow" /></span></div>
                <div className="preview-bottom"><div><span>84%</span><small>Avg. score</small></div><div><span>18</span><small>Quizzes</small></div><div><span>6h</span><small>Learning</small></div></div>
              </div>
            </div>
            <div className="float-card float-top"><span><Icon name="lightning" /></span><div><strong>7 day streak</strong><small>Personal best!</small></div></div>
            <div className="float-card float-bottom"><span><Icon name="check" /></span><div><strong>Quiz complete</strong><small>Score: 92%</small></div></div>
          </div>
        </section>

        <section className="logo-strip"><p>Trusted by curious minds at</p><div><strong>vertex</strong><strong>monday</strong><strong>northstar</strong><strong>lumina</strong><strong>orbit</strong></div></section>

        <section className="section shell" id="features">
          <div className="section-heading centered"><p className="eyebrow">Built for better learning</p><h2>Practice that actually<br /><span>moves you forward.</span></h2><p>Every feature is designed to turn scattered effort into lasting understanding.</p></div>
          <div className="feature-grid">
            {features.map(([icon, title, copy]) => <article className="feature-card" key={title}><span className="feature-icon"><Icon name={icon} /></span><h3>{title}</h3><p>{copy}</p><a href="#workflow">Learn more <Icon name="arrow" /></a></article>)}
          </div>
        </section>

        <section className="section topic-section" id="workflow">
          <div className="shell split-section">
            <div><p className="eyebrow">Personalized from day one</p><h2>Your learning.<br /><span>Your momentum.</span></h2><p className="section-copy">Choose a topic, set your goal, and let QuizForge shape the next best practice session. Every answer helps make the next quiz sharper.</p><Link className="button button-primary" href="/signup">Build your learning path <Icon name="arrow" /></Link></div>
            <div className="topic-stack">{topics.map(([name, count, score, background]) => <article className="topic-card" key={name}><span className="topic-art" style={{ background }}><Icon name="brain" /></span><div><h3>{name}</h3><p>{count}</p></div><strong>{score}<small> mastery</small></strong></article>)}</div>
          </div>
        </section>

        <section className="section shell" id="insights">
          <div className="cta-panel">
            <div><p className="eyebrow">Start your next breakthrough</p><h2>Make your study time count.</h2><p>Join thousands of learners building knowledge with clarity and momentum.</p></div>
            <Link className="button button-dark" href="/signup">Create your free account <Icon name="arrow" /></Link>
          </div>
        </section>
      </main>
      <footer className="site-footer"><div className="shell"><span>QuizForge</span><p>Adaptive learning, thoughtfully built.</p><small>&copy; 2026 QuizForge</small></div></footer>
    </>
  );
}
