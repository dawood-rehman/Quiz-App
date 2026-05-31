import type { Metadata } from "next";
import { SettingsExperience } from "@/components/settings/settings-experience";

export const metadata: Metadata = { title: "Account settings" };

export default function SettingsPage() {
  return <SettingsExperience />;
}
