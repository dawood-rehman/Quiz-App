"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast-provider";
import { authenticatedFetch } from "@/lib/client/authenticated-fetch";

type TeamSummary = {
  id: string;
  name: string;
  description?: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  owner: { id: string; name: string };
  _count: { challenges: number; members: number };
};

type Invitation = {
  id: string;
  invitedBy: { name: string };
  team: { id: string; name: string; description?: string | null; _count: { members: number } };
};

type TeamDetail = TeamSummary & {
  canManage: boolean;
  stats: { accuracy: number; challenges: number; members: number; submissions: number };
  members: Array<{ id: string; role: "OWNER" | "ADMIN" | "MEMBER"; user: { id: string; email: string; name: string } }>;
  invitations: Array<{ id: string; email: string; expiresAt: string; role: "ADMIN" | "MEMBER"; quiz?: { id: string; title: string } | null }>;
  rankings: Array<{ userId: string; name: string; rank: number; rating: number; accuracy: number; completed: number; streak: number }>;
  recentActivity: Array<{ challengeTitle: string; completedAt: string; name: string; score: number; total: number }>;
  quizzes: Array<{ id: string; title: string; topic: string }>;
  challenges: Array<{
    id: string;
    title: string;
    status: "OPEN" | "CLOSED";
    deadline?: string | null;
    attempts: unknown[];
    quiz: { id: string; title: string; topic: string; _count: { questions: number } };
  }>;
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? fallback);
  return payload;
}

export function TeamExperience() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [detail, setDetail] = useState<TeamDetail>();
  const [busy, setBusy] = useState(false);

  const loadTeams = useCallback(async () => {
    const [teamsPayload, invitationsPayload] = await Promise.all([
      readJson<{ teams: TeamSummary[] }>(await authenticatedFetch("/api/teams"), "Teams could not be loaded."),
      readJson<{ invitations: Invitation[] }>(await authenticatedFetch("/api/teams/invitations"), "Team invitations could not be loaded."),
    ]);
    setTeams(teamsPayload.teams);
    setInvitations(invitationsPayload.invitations);
    setSelectedTeamId((current) => current || teamsPayload.teams[0]?.id || "");
  }, []);

  const loadDetail = useCallback(async (teamId: string) => {
    if (!teamId) {
      setDetail(undefined);
      return;
    }
    const payload = await readJson<{ team: TeamDetail }>(await authenticatedFetch(`/api/teams/${teamId}`), "Team dashboard could not be loaded.");
    setDetail(payload.team);
  }, []);

  useEffect(() => {
    loadTeams().catch((error) => toast({ message: error instanceof Error ? error.message : "Teams could not be loaded.", tone: "error" }));
  }, [loadTeams, toast]);

  useEffect(() => {
    loadDetail(selectedTeamId).catch((error) => toast({ message: error instanceof Error ? error.message : "Team dashboard could not be loaded.", tone: "error" }));
  }, [loadDetail, selectedTeamId, toast]);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget as HTMLFormElement;
    const form = new FormData(formEl);
    setBusy(true);
    try {
      const payload = await readJson<{ team: { id: string } }>(await authenticatedFetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), description: form.get("description") || undefined }),
      }), "Team could not be created.");
      formEl.reset();
      await loadTeams();
      setSelectedTeamId(payload.team.id);
      toast({ message: "Workspace created. You can now invite collaborators by email.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Team could not be created.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function respond(invitationId: string, action: "ACCEPT" | "DECLINE") {
    setBusy(true);
    try {
      await readJson(await authenticatedFetch(`/api/teams/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }), "Invitation could not be updated.");
      await loadTeams();
      toast({ message: action === "ACCEPT" ? "Invitation accepted. Welcome to the team." : "Invitation declined.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Invitation could not be updated.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const formEl = event.currentTarget as HTMLFormElement;
    const form = new FormData(formEl);
    setBusy(true);
    try {
      const payload = await readJson<{ result: { delivery: "added" | "invited"; email: string } }>(await authenticatedFetch(`/api/teams/${detail.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
      }), "Invitation could not be sent.");
      formEl.reset();
      await Promise.all([loadDetail(detail.id), loadTeams()]);
      toast({ message: payload.result.delivery === "added" ? `${payload.result.email} was added to the workspace.` : `Invitation sent to ${payload.result.email}.`, tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Invitation could not be sent.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function resendInvitation(invitationId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await readJson(await authenticatedFetch(`/api/teams/${detail.id}/invitations/${invitationId}/resend`, { method: "POST" }), "Invitation could not be resent.");
      await loadDetail(detail.id);
      toast({ message: "Invitation email sent again.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Invitation could not be resent.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function updateMemberRole(memberId: string, role: "ADMIN" | "MEMBER") {
    if (!detail) return;
    setBusy(true);
    try {
      await readJson(await authenticatedFetch(`/api/teams/${detail.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }), "Workspace role could not be updated.");
      await loadDetail(detail.id);
      toast({ message: "Workspace role updated.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Workspace role could not be updated.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await readJson(await authenticatedFetch(`/api/teams/${detail.id}/members/${memberId}`, { method: "DELETE" }), "Workspace member could not be removed.");
      await Promise.all([loadDetail(detail.id), loadTeams()]);
      toast({ message: "Workspace member removed.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Workspace member could not be removed.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function createChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const formEl = event.currentTarget as HTMLFormElement;
    const form = new FormData(formEl);
    setBusy(true);
    try {
      await readJson(await authenticatedFetch(`/api/teams/${detail.id}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: form.get("quizId"), title: form.get("title") }),
      }), "Challenge could not be created.");
      formEl.reset();
      await loadDetail(detail.id);
      toast({ message: "Team challenge published.", tone: "success" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Challenge could not be created.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="dashboard-main teams-main">
        <header className="dashboard-header dashboard-header-simple">
          <PageToolbar>
            <div className="dashboard-heading">
              <p className="eyebrow"><Icon name="users" /> Workspace collaboration</p>
              <h1>Workspaces and challenges</h1>
              <span>Invite by email, collaborate on quizzes, and improve together.</span>
            </div>
          </PageToolbar>
        </header>

        {invitations.map((invitation) => <section className="team-invitation" key={invitation.id}><div><strong>{invitation.team.name}</strong><p>{invitation.invitedBy.name} invited you to join a workspace with {invitation.team._count.members} registered members.</p></div><div><button className="button button-primary button-small" disabled={busy} onClick={() => respond(invitation.id, "ACCEPT")}>Accept</button><button className="button button-quiet button-small" disabled={busy} onClick={() => respond(invitation.id, "DECLINE")}>Decline</button></div></section>)}

        <div className="teams-layout">
          <aside className="teams-sidebar">
            <section className="side-card">
              <p className="eyebrow">Your workspaces</p>
              <div className="team-switcher">
                {teams.map((team) => <button className={selectedTeamId === team.id ? "active" : ""} key={team.id} onClick={() => setSelectedTeamId(team.id)}><strong>{team.name}</strong><small>{team._count.members} members - {team._count.challenges} challenges</small></button>)}
                {!teams.length && <p className="empty-copy">You have not joined a workspace yet.</p>}
              </div>
            </section>
            <section className="side-card">
              <p className="eyebrow"><Icon name="plus" /> New workspace</p>
              <form className="team-form" onSubmit={createTeam}>
                <label><span>Name</span><input name="name" placeholder="Study circle" required /></label>
                <label><span>Description</span><input name="description" placeholder="Optional workspace goal" /></label>
                <button className="button button-primary button-small" disabled={busy}>Create workspace</button>
              </form>
            </section>
          </aside>

          <section className="teams-content">
            {!detail && <section className="library-card empty-state"><span className="feature-icon"><Icon name="users" /></span><h3>Create your first workspace</h3><p>Invite collaborators by email and launch a quiz challenge when you are ready.</p></section>}
            {detail && <>
              <section className="team-hero"><div><p className="eyebrow">Workspace {detail.role.toLowerCase()}</p><h2>{detail.name}</h2><p>{detail.description ?? "A shared space for focused learning challenges."}</p></div><span className="feature-icon"><Icon name="users" /></span></section>
              <section className="team-stat-grid">
                <article><small>Members</small><strong>{detail.stats.members}</strong></article>
                <article><small>Challenges</small><strong>{detail.stats.challenges}</strong></article>
                <article><small>Submissions</small><strong>{detail.stats.submissions}</strong></article>
                <article><small>Workspace accuracy</small><strong>{detail.stats.accuracy}%</strong></article>
              </section>

              {detail.canManage && <section className="library-card">
                <div className="section-row"><div><p className="eyebrow">Workspace controls</p><h2>Invite collaborator by email</h2></div></div>
                <form className="team-search" onSubmit={invite}><input name="email" placeholder="collaborator@example.com" required type="email" /><select name="role"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select><button className="button button-primary button-small" disabled={busy}>Invite</button></form>
                <div className="team-search-results">{detail.invitations.map((invitation) => <article key={invitation.id}><div><strong>{invitation.email}</strong><small>Pending {invitation.role.toLowerCase()} invite - expires {new Date(invitation.expiresAt).toLocaleDateString()}</small></div><button className="table-link" disabled={busy} onClick={() => resendInvitation(invitation.id)}>Resend</button></article>)}</div>
              </section>}

              {detail.canManage && <section className="library-card">
                <div className="section-row"><div><p className="eyebrow">Workspace controls</p><h2>Publish a challenge</h2></div></div>
                <form className="team-challenge-form" onSubmit={createChallenge}>
                  <input name="title" placeholder="Challenge title" required />
                  <select name="quizId" required><option value="">Choose a saved quiz</option>{detail.quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title} - {quiz.topic}</option>)}</select>
                  <button className="button button-primary button-small" disabled={busy || !detail.quizzes.length}>Publish</button>
                </form>
                {!detail.quizzes.length && <p className="empty-copy">Generate a quiz from your dashboard before publishing a challenge.</p>}
              </section>}

              <section className="library-card">
                <div className="section-row"><div><p className="eyebrow">Compete together</p><h2>Challenge history</h2></div><span className="select-pill">{detail.challenges.length} total</span></div>
                <div className="challenge-list">{detail.challenges.map((challenge) => <article key={challenge.id}><div><strong>{challenge.title}</strong><small>{challenge.quiz.topic} - {challenge.quiz._count.questions} questions - {challenge.attempts.length} submissions</small></div><Link className="button button-primary button-small" href={`/quiz/${challenge.quiz.id}?challenge=${challenge.id}`}>Take quiz <Icon name="arrow" /></Link></article>)}{!detail.challenges.length && <p className="empty-copy">No challenge has been published yet.</p>}</div>
              </section>

              <section className="library-card">
                <div className="section-row"><div><p className="eyebrow">Access management</p><h2>Workspace members</h2></div><span className="select-pill">{detail.members.length} total</span></div>
                <div className="workspace-member-list">{detail.members.map((member) => <article key={member.id}><div><strong>{member.user.name}</strong><small>{member.user.email}</small></div><div>{detail.canManage && member.role !== "OWNER" ? <><select disabled={busy} onChange={(event) => updateMemberRole(member.id, event.target.value as "ADMIN" | "MEMBER")} value={member.role}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select><button className="table-link danger" disabled={busy} onClick={() => removeMember(member.id)}>Remove</button></> : <span className="status-pill published">{member.role.toLowerCase()}</span>}</div></article>)}</div>
              </section>

              <div className="team-dashboard-grid">
                <section className="library-card"><div className="section-row"><div><p className="eyebrow">Performance rating</p><h2>Member leaderboard</h2></div></div><div className="ranking-list">{detail.rankings.map((member) => <article key={member.userId}><b>#{member.rank}</b><div><strong>{member.name}</strong><small>{member.completed} submissions - {member.accuracy}% accuracy - {member.streak} day streak</small></div><span>{member.rating} pts</span></article>)}</div></section>
                <section className="library-card"><div className="section-row"><div><p className="eyebrow">Latest submissions</p><h2>Recent activity</h2></div></div><div className="activity-list">{detail.recentActivity.map((activity) => <article key={`${activity.name}-${activity.challengeTitle}-${activity.completedAt}`}><div><strong>{activity.name}</strong><small>{activity.challengeTitle}</small></div><span>{activity.score}/{activity.total}</span></article>)}{!detail.recentActivity.length && <p className="empty-copy">Completed challenge attempts will appear here.</p>}</div></section>
              </div>
            </>}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
