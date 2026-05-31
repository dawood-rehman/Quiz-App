"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AccountActions } from "@/components/dashboard/account-actions";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast-provider";
import { authenticatedFetch } from "@/lib/client/authenticated-fetch";

type Insights = {
  metrics: {
    completed: number;
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    averageScore: number;
    bestScore: number;
    accuracy: number;
    learningSeconds: number;
  };
  streak: { current: number; longest: number; lastActiveDate?: string | null };
  activity: Array<{ dayKey: string; quizzes: number; accuracy: number }>;
  topicPerformance: Array<{ topic: string; accuracy: number; quizzes: number }>;
  quizHistory: Array<{ id: string; completedAt: string; accuracy: number; score: number; total: number; quiz: { id: string; title: string; topic: string } }>;
  achievements: Array<{ label: string; description: string }>;
  rank?: number | null;
  rating: number;
  recommendation: string;
};

type CurrentUser = { name: string; email: string };

type LibraryQuiz = {
  id: string;
  title: string;
  description?: string | null;
  topic: string;
  difficulty: string;
  isAIGenerated: boolean;
  createdAt: string;
  _count: { questions: number; attempts: number };
};

type GeneratedQuiz = Omit<LibraryQuiz, "_count"> & { questions: unknown[] };
type Workspace = { id: string; name: string; role: "OWNER" | "ADMIN" | "MEMBER" };
type WorkspaceMember = { id: string; role: "OWNER" | "ADMIN" | "MEMBER"; user: { id: string; email: string; name: string } };

const GENERATION_TIMEOUT_MS = 55_000;

function formatDuration(seconds = 0) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function DashboardExperience() {
  const router = useRouter();
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insights>();
  const [user, setUser] = useState<CurrentUser>();
  const [today, setToday] = useState("Today's focus");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("ADAPTIVE");
  const [generating, setGenerating] = useState(false);
  const [library, setLibrary] = useState<LibraryQuiz[]>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [collaboratorUserIds, setCollaboratorUserIds] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pendingCollaboratorEmails, setPendingCollaboratorEmails] = useState<string[]>([]);

  const loadLibrary = useCallback(async () => {
    const response = await authenticatedFetch("/api/quizzes?scope=mine");
    const payload = await response.json().catch(() => ({})) as { quizzes?: LibraryQuiz[]; error?: { message?: string } };
    if (!response.ok || !payload.quizzes) throw new Error(payload.error?.message ?? "Your quiz library could not be loaded.");
    setLibrary(payload.quizzes);
  }, []);

  const loadWorkspaceMembers = useCallback(async (teamId: string) => {
    if (!teamId) {
      setWorkspaceMembers([]);
      setCollaboratorUserIds([]);
      setPendingCollaboratorEmails([]);
      return;
    }
    const response = await authenticatedFetch(`/api/teams/${teamId}/members`);
    const payload = await response.json().catch(() => ({})) as { members?: WorkspaceMember[]; error?: { message?: string } };
    if (!response.ok || !payload.members) throw new Error(payload.error?.message ?? "Workspace members could not be loaded.");
    setWorkspaceMembers(payload.members);
    setCollaboratorUserIds((current) => current.filter((userId) => payload.members?.some((member) => member.user.id === userId)));
  }, []);

  useEffect(() => {
    setToday(new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date()));
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    authenticatedFetch(`/api/insights?timezone=${encodeURIComponent(timezone)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: Insights) => setInsights(data))
      .catch(() => toast({ message: "Your learning insights could not be loaded. Please refresh the page.", tone: "error" }));
    authenticatedFetch("/api/auth/me")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { user: CurrentUser }) => setUser(data.user))
      .catch(() => toast({ message: "Your profile could not be loaded. Please refresh the page.", tone: "error" }));
    loadLibrary()
      .catch((error) => toast({ message: error instanceof Error ? error.message : "Your quiz library could not be loaded.", tone: "error" }));
    authenticatedFetch("/api/teams")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { teams: Workspace[] }) => setWorkspaces(data.teams.filter((team) => team.role === "OWNER" || team.role === "ADMIN")))
      .catch(() => toast({ message: "Your workspaces could not be loaded.", tone: "error" }));
  }, [loadLibrary, toast]);

  useEffect(() => {
    loadWorkspaceMembers(workspaceId)
      .catch((error) => toast({ message: error instanceof Error ? error.message : "Workspace members could not be loaded.", tone: "error" }));
  }, [loadWorkspaceMembers, toast, workspaceId]);

  async function generateQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
    setGenerating(true);
    try {
      const response = await authenticatedFetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty, questionCount: 5, workspaceId: workspaceId || undefined, collaboratorUserIds, pendingCollaboratorEmails }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as { quiz?: GeneratedQuiz; error?: { message: string } };
      if (!response.ok || !payload.quiz) throw new Error(payload.error?.message ?? "Quiz generation failed.");
      const quiz = payload.quiz;
      setLibrary((current) => [
        { ...quiz, _count: { attempts: 0, questions: quiz.questions.length } },
        ...(current ?? []).filter((item) => item.id !== quiz.id),
      ]);
      toast({
        message: `${quiz.title} is ready. Opening your new quiz now.`,
        tone: "success",
      });
      router.push(`/quiz/${quiz.id}`);
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "Quiz generation took too long. Please try again in a moment."
        : error instanceof Error
          ? error.message
          : "Quiz generation failed.";
      toast({ message, tone: "error" });
    } finally {
      window.clearTimeout(timeout);
      setGenerating(false);
    }
  }

  async function inviteWorkspaceMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;
    setInviting(true);
    try {
      const response = await authenticatedFetch(`/api/teams/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: "MEMBER" }),
      });
      const payload = await response.json().catch(() => ({})) as { result?: { delivery: "added" | "invited"; email: string; userId?: string }; error?: { message?: string } };
      if (!response.ok || !payload.result) throw new Error(payload.error?.message ?? "Workspace invitation could not be sent.");
      const result = payload.result;
      setInviteEmail("");
      await loadWorkspaceMembers(workspaceId);
      if (result.delivery === "added" && result.userId) {
        const userId = result.userId;
        setCollaboratorUserIds((current) => current.includes(userId) ? current : [...current, userId]);
      } else {
        setPendingCollaboratorEmails((current) => current.includes(result.email) ? current : [...current, result.email]);
      }
      toast({
        message: result.delivery === "added"
          ? `${result.email} was added to the workspace.`
          : `Invitation sent to ${result.email}. They will join after registration.`,
        tone: "success",
      });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Workspace invitation could not be sent.", tone: "error" });
    } finally {
      setInviting(false);
    }
  }

  function toggleCollaborator(userId: string) {
    setCollaboratorUserIds((current) => current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]);
  }

  async function logOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("You could not be logged out. Please try again.");
      toast({ message: "You have been logged out securely.", tone: "success" });
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "You could not be logged out. Please try again.", tone: "error" });
    }
  }

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <main className="app-layout" id="main-content">
      <AppSidebar />
      <section className="dashboard-main">
        <header className="dashboard-header">
          <div><p className="eyebrow">{today}</p><h1>Good morning, {firstName}.</h1><span>Small sessions. Serious momentum.</span></div>
          <div className="dashboard-actions">
            <a aria-label="View quiz library" className="icon-button" href="#library"><Icon name="grid" /></a>
            <AccountActions onLogout={logOut} user={user} />
          </div>
        </header>

        <section className="welcome-panel">
          <div><p className="eyebrow light"><Icon name="lightning" /> {insights?.streak.current ?? 0} day current streak</p><h2>{insights?.streak.current ? "Keep your momentum" : "Start your streak"}<br />with one focused quiz.</h2><p>{insights?.streak.longest ? `Your longest streak is ${insights.streak.longest} days.` : "Complete a quiz today to begin tracking your learning rhythm."}</p><a className="button button-white" href="#studio">Create today&apos;s quiz <Icon name="arrow" /></a></div>
          <div className="welcome-illustration"><div className="orbit-ring" /><span className="big-brain"><Icon name="brain" /></span><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /><span className="orbit-star"><Icon name="sparkles" /></span></div>
        </section>

        <section className="metric-grid">
          <article><span className="metric-icon mint"><Icon name="target" /></span><div><small>Accuracy</small><strong>{insights ? `${insights.metrics.accuracy}%` : <span className="skeleton skeleton-value" />}</strong><p>{insights?.metrics.correctAnswers ?? 0} correct answers</p></div></article>
          <article><span className="metric-icon lilac"><Icon name="grid" /></span><div><small>Quizzes completed</small><strong>{insights ? insights.metrics.completed : <span className="skeleton skeleton-value" />}</strong><p>Your learning history</p></div></article>
          <article><span className="metric-icon amber"><Icon name="clock" /></span><div><small>Learning time</small><strong>{insights ? formatDuration(insights.metrics.learningSeconds) : <span className="skeleton skeleton-value" />}</strong><p>Measured quiz time</p></div></article>
          <article><span className="metric-icon mint"><Icon name="check" /></span><div><small>Questions answered</small><strong>{insights ? insights.metrics.totalQuestions : <span className="skeleton skeleton-value" />}</strong><p>{insights?.metrics.incorrectAnswers ?? 0} incorrect answers</p></div></article>
          <article><span className="metric-icon lilac"><Icon name="chart" /></span><div><small>Best score</small><strong>{insights ? `${insights.metrics.bestScore}%` : <span className="skeleton skeleton-value" />}</strong><p>Personal record</p></div></article>
          <article><span className="metric-icon amber"><Icon name="lightning" /></span><div><small>Leaderboard rank</small><strong>{insights ? insights.rank ? `#${insights.rank}` : "--" : <span className="skeleton skeleton-value" />}</strong><p>{insights?.rating ?? 0} rating points</p></div></article>
        </section>

        <div className="dashboard-columns">
          <section className="dashboard-left">
            <section className="library-card" id="library">
              <div className="section-row"><div><p className="eyebrow">Saved practice sets</p><h2>My quiz library</h2></div><span className="select-pill">{library ? `${library.length} saved` : "Loading..."}</span></div>
              <div className="library-grid">
                {!library && [0, 1].map((item) => <div className="library-item library-skeleton" key={item}><span className="skeleton state-line state-line-short" /><span className="skeleton state-line state-line-title" /><span className="skeleton state-line" /></div>)}
                {library?.map((quiz) => (
                  <Link className="library-item" href={`/quiz/${quiz.id}`} key={quiz.id}>
                    <header><span className="library-icon"><Icon name={quiz.isAIGenerated ? "sparkles" : "grid"} /></span><span className="status-pill published">Saved</span></header>
                    <p className="eyebrow">{quiz.topic}</p>
                    <h3>{quiz.title}</h3>
                    <p>{quiz.description ?? "A focused practice set ready for your next study session."}</p>
                    <footer><span>{quiz._count.questions} questions</span><span>{quiz.difficulty.toLowerCase()} <Icon name="arrow" /></span></footer>
                  </Link>
                ))}
                {library?.length === 0 && <div className="empty-state"><span className="feature-icon"><Icon name="grid" /></span><h3>Your library is ready</h3><p>Generate your first quiz and it will appear here automatically.</p><a className="button button-primary button-small" href="#studio">Create a quiz</a></div>}
              </div>
            </section>

            <section className="studio-card" id="studio">
              <div className="section-row"><div><p className="eyebrow"><Icon name="sparkles" /> AI quiz studio</p><h2>What do you want to master?</h2></div></div>
              <p>Create a focused five-question practice set with teaching-first explanations.</p>
              <form aria-busy={generating} className="studio-form" onInvalid={() => toast({ message: "Enter a topic before generating your quiz.", tone: "warning" })} onSubmit={generateQuiz}>
                <label><span>Topic</span><input disabled={generating} maxLength={120} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Artificial Intelligence or Lahore" required value={topic} /></label>
                <label><span>Difficulty</span><select disabled={generating} onChange={(event) => setDifficulty(event.target.value)} value={difficulty}><option value="ADAPTIVE">Adaptive</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
                <label><span>Workspace</span><select disabled={generating} onChange={(event) => setWorkspaceId(event.target.value)} value={workspaceId}><option value="">Personal quiz</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
                <button className="button button-primary" disabled={generating} type="submit">{generating ? "Generating..." : "Generate quiz"} <Icon name="sparkles" /></button>
              </form>
              {workspaceId && <div className="studio-collaboration">
                <div className="section-row"><div><p className="eyebrow">Quiz collaborators</p><h3>Select workspace members</h3></div><span className="select-pill">{collaboratorUserIds.length} selected</span></div>
                <div className="collaborator-checklist">
                  {workspaceMembers.map((member) => <label key={member.id}><input checked={collaboratorUserIds.includes(member.user.id)} onChange={() => toggleCollaborator(member.user.id)} type="checkbox" /><span><strong>{member.user.name}</strong><small>{member.user.email} - {member.role.toLowerCase()}</small></span></label>)}
                  {!workspaceMembers.length && <p className="empty-copy">Invite a member to collaborate on this quiz.</p>}
                </div>
                {pendingCollaboratorEmails.length > 0 && <div className="pending-collaborators">{pendingCollaboratorEmails.map((email) => <span key={email}>{email} - pending registration</span>)}</div>}
                <form className="studio-invite-form" onSubmit={inviteWorkspaceMember}><input onChange={(event) => setInviteEmail(event.target.value)} placeholder="Invite collaborator by email" required type="email" value={inviteEmail} /><button className="button button-quiet button-small" disabled={inviting} type="submit">{inviting ? "Sending..." : "Invite member"}</button></form>
              </div>}
            </section>
            <section className="library-card" id="history">
              <div className="section-row"><div><p className="eyebrow">Recorded activity</p><h2>Quiz history</h2></div><span className="select-pill">{insights ? `${insights.quizHistory.length} recent` : "Loading..."}</span></div>
              <div className="history-list">
                {insights?.quizHistory.map((attempt) => <Link href={`/quiz/${attempt.quiz.id}`} key={attempt.id}><div><strong>{attempt.quiz.title}</strong><small>{attempt.quiz.topic} - {new Date(attempt.completedAt).toLocaleDateString()}</small></div><span>{attempt.score}/{attempt.total} - {attempt.accuracy}%</span></Link>)}
                {insights && !insights.quizHistory.length && <p className="empty-copy">Your completed quizzes will appear here.</p>}
              </div>
            </section>
          </section>

          <aside className="dashboard-right" id="progress">
            <section className="side-card">
              <div className="section-row"><div><p className="eyebrow">Your activity</p><h2>This week</h2></div><span className="select-pill">Last 7 days</span></div>
              <div aria-label="Real quiz accuracy over the last seven days" className="mini-chart" role="img">{insights?.activity.map((day) => <div key={day.dayKey}><i><b style={{ height: `${day.quizzes ? Math.max(12, day.accuracy) : 0}%` }} /></i><small>{new Date(`${day.dayKey}T00:00:00Z`).toLocaleDateString("en", { weekday: "narrow", timeZone: "UTC" })}</small></div>)}</div>
            </section>
            <section className="side-card">
              <div className="section-row"><div><p className="eyebrow">Daily consistency</p><h2>{insights?.streak.current ?? 0} day streak</h2></div><span className="select-pill">Best {insights?.streak.longest ?? 0}</span></div>
              <p className="side-copy">{insights?.streak.lastActiveDate ? `Last quiz completed on ${insights.streak.lastActiveDate}.` : "Complete your first quiz to activate streak tracking."}</p>
            </section>
            <section className="side-card insight-card">
              <span className="feature-icon"><Icon name="sparkles" /></span>
              <p className="eyebrow">Smart suggestion</p><h3>Your next best step</h3><p>{insights?.recommendation ?? "Complete your first quiz to unlock a personalized recommendation."}</p><a href="#studio">Create suggested quiz <Icon name="arrow" /></a>
            </section>
            <section className="side-card">
              <div className="section-row"><div><p className="eyebrow">Mastery</p><h2>Top topics</h2></div></div>
              {insights?.topicPerformance.slice(0, 4).map(({ topic: name, accuracy }) => <div className="mastery-row" key={name}><span>{name}</span><i><b style={{ width: `${accuracy}%` }} /></i><strong>{accuracy}%</strong></div>)}
              {insights && !insights.topicPerformance.length && <p className="empty-copy">Topic mastery appears after your first quiz.</p>}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
