import type { Metadata } from "next";
import { TeamExperience } from "@/components/teams/team-experience";

export const metadata: Metadata = { title: "Teams" };

export default function TeamsPage() {
  return <TeamExperience />;
}
