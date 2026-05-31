"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast-provider";
import { authenticatedFetch } from "@/lib/client/authenticated-fetch";

type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  createdAt: string;
  _count: { attempts: number };
};

type Stats = {
  users: number;
  activeUsers: number;
  attempts: number;
  completedThisWeek: number;
  aiRequests: Array<{ status: string; _count: number }>;
  recentLogs: Array<{ id: string; action: string; createdAt: string; user?: { name: string } | null }>;
};

type Quiz = {
  id: string;
  title: string;
  topic: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  difficulty: string;
  _count: { questions: number; attempts: number };
};

export function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>();
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [query, setQuery] = useState("");
  const [busyUserId, setBusyUserId] = useState("");

  const load = useCallback(async () => {
    try {
      const [statsResponse, usersResponse, quizzesResponse] = await Promise.all([
        authenticatedFetch("/api/admin/stats"),
        authenticatedFetch(`/api/admin/users?query=${encodeURIComponent(query)}`),
        authenticatedFetch("/api/admin/quizzes"),
      ]);
      if (!statsResponse.ok || !usersResponse.ok || !quizzesResponse.ok) throw new Error("Admin data could not be loaded.");
      setStats(await statsResponse.json());
      setUsers((await usersResponse.json()).users);
      setQuizzes((await quizzesResponse.json()).quizzes);
    } catch (caught) {
      toast({ message: caught instanceof Error ? caught.message : "Admin data could not be loaded.", tone: "error" });
    }
  }, [query, toast]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  async function toggleBan(user: User) {
    setBusyUserId(user.id);
    try {
      const response = await authenticatedFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: user.status === "ACTIVE" ? "BANNED" : "ACTIVE" }),
      });
      if (!response.ok) throw new Error("Account status could not be updated.");
      toast({ message: `${user.name}'s account status was updated.`, tone: "success" });
      await load();
    } catch (caught) {
      toast({ message: caught instanceof Error ? caught.message : "Account status could not be updated.", tone: "error" });
    } finally {
      setBusyUserId("");
    }
  }

  async function toggleRole(user: User) {
    setBusyUserId(user.id);
    try {
      const response = await authenticatedFetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: user.role === "USER" ? "ADMIN" : "USER" }),
      });
      if (!response.ok) throw new Error("Account role could not be updated.");
      toast({ message: `${user.name}'s role was updated.`, tone: "success" });
      await load();
    } catch (caught) {
      toast({ message: caught instanceof Error ? caught.message : "Account role could not be updated.", tone: "error" });
    } finally {
      setBusyUserId("");
    }
  }

  const successRequests = stats?.aiRequests.find((entry) => entry.status === "SUCCESS")?._count ?? 0;

  return (
    <main className="app-layout" id="main-content">
      <AppSidebar admin />
      <section className="dashboard-main admin-main">
        <header className="dashboard-header">
          <div><p className="eyebrow">Operations center</p><h1>Platform overview</h1><span>Monitor learning activity, AI usage, and account health.</span></div>
          <a className="button button-primary button-small" href="#quizzes"><Icon name="grid" /> Quiz catalog</a>
        </header>

        <section className="metric-grid admin-metrics">
          {[
            ["users", "Total users", stats?.users ?? "-", "All registered learners"],
            ["activity", "Active sessions", stats?.activeUsers ?? "-", "Currently valid sessions"],
            ["target", "Quiz attempts", stats?.attempts ?? "-", `${stats?.completedThisWeek ?? 0} completed this week`],
            ["sparkles", "AI generations", successRequests, "Successful this week"],
          ].map(([icon, label, value, detail]) => <article key={label}><span className="metric-icon mint"><Icon name={icon as "users"} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}
        </section>

        <section className="admin-grid">
          <article className="admin-card chart-card">
            <div className="section-row"><div><p className="eyebrow">Growth metrics</p><h2>Learner activity</h2></div><span className="select-pill">Last 30 days</span></div>
            <div aria-label="Learner growth visualization" className="line-chart" role="img"><svg preserveAspectRatio="none" viewBox="0 0 600 180"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6d5ce7" stopOpacity=".28" /><stop offset="100%" stopColor="#6d5ce7" stopOpacity="0" /></linearGradient></defs><path d="M0 150 C70 132 72 98 145 112 S240 74 300 82 S390 42 450 60 S540 18 600 28 L600 180 L0 180Z" fill="url(#fill)" /><path d="M0 150 C70 132 72 98 145 112 S240 74 300 82 S390 42 450 60 S540 18 600 28" fill="none" stroke="#6d5ce7" strokeWidth="5" /></svg></div>
          </article>
          <article className="admin-card" id="monitoring">
            <div className="section-row"><div><p className="eyebrow">System activity</p><h2>Recent events</h2></div></div>
            <div className="event-list">{stats?.recentLogs.length ? stats.recentLogs.map((log) => <div key={log.id}><span className="status-dot" /><p><strong>{log.action.replaceAll("_", " ").toLowerCase()}</strong><small>{log.user?.name ?? "System"} - {new Date(log.createdAt).toLocaleDateString()}</small></p></div>) : <p className="empty-copy">No activity logs yet.</p>}</div>
          </article>
        </section>

        <section className="admin-card quiz-admin-card" id="quizzes">
          <div className="section-row"><div><p className="eyebrow">Quiz management</p><h2>Published catalog</h2></div><span className="select-pill">{quizzes.length} total quizzes</span></div>
          <div className="quiz-admin-grid">
            {quizzes.slice(0, 6).map((quiz) => (
              <article key={quiz.id}>
                <div><span className={`status-pill ${quiz.status.toLowerCase()}`}>{quiz.status}</span><small>{quiz.difficulty.toLowerCase()}</small></div>
                <h3>{quiz.title}</h3>
                <p>{quiz.topic}</p>
                <footer><span>{quiz._count.questions} questions</span><span>{quiz._count.attempts} attempts</span></footer>
              </article>
            ))}
            {!quizzes.length && <div className="empty-state"><span className="feature-icon"><Icon name="grid" /></span><h3>No quizzes yet</h3><p>Create your first quiz through the admin API or generate one in the learner studio.</p></div>}
          </div>
        </section>

        <section className="admin-card user-card" id="users">
          <div className="section-row"><div><p className="eyebrow">User management</p><h2>Learner accounts</h2></div><label className="search-field"><Icon name="search" /><span className="sr-only">Search users</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" value={query} /></label></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Attempts</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{users.map((user) => <tr key={user.id}><td data-label="User"><div className="table-user"><span>{user.name.slice(0, 2).toUpperCase()}</span><p><strong>{user.name}</strong><small>{user.email}</small></p></div></td><td data-label="Role"><button className="table-link" disabled={busyUserId === user.id} onClick={() => toggleRole(user)}>{user.role}</button></td><td data-label="Status"><span className={`status-pill ${user.status.toLowerCase()}`}>{user.status}</span></td><td data-label="Attempts">{user._count.attempts}</td><td data-label="Joined">{new Date(user.createdAt).toLocaleDateString()}</td><td data-label="Action"><button className="table-link" disabled={busyUserId === user.id} onClick={() => toggleBan(user)}>{busyUserId === user.id ? "Updating..." : user.status === "ACTIVE" ? "Suspend" : "Restore"}</button></td></tr>)}</tbody>
            </table>
            {!users.length && <p className="empty-copy">No matching users found.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
