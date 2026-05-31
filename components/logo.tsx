import Link from "next/link";
import { Icon } from "@/components/icons";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="QuizForge home" className="logo" href="/">
      <span className="logo-mark"><Icon name="brain" /></span>
      {!compact && <span>Quiz<span>Forge</span></span>}
    </Link>
  );
}
