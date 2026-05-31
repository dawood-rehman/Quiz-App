import type { Metadata } from "next";
import { DashboardExperience } from "@/components/dashboard/dashboard-experience";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <DashboardExperience />;
}
