import type { ReactElement, SVGProps } from "react";

type IconName =
  | "activity"
  | "arrow"
  | "brain"
  | "chart"
  | "check"
  | "clock"
  | "close"
  | "dashboard"
  | "eye"
  | "eyeOff"
  | "grid"
  | "lightning"
  | "lock"
  | "menu"
  | "play"
  | "plus"
  | "search"
  | "settings"
  | "sparkles"
  | "target"
  | "users";

const paths: Record<IconName, ReactElement> = {
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  brain: <path d="M9.5 4.5a3 3 0 0 0-5 2.25A3.5 3.5 0 0 0 5 13.5V16a3 3 0 0 0 5.5 1.7V6a2.5 2.5 0 0 0-1-1.5ZM14.5 4.5a3 3 0 0 1 5 2.25 3.5 3.5 0 0 1-.5 6.75V16a3 3 0 0 1-5.5 1.7V6a2.5 2.5 0 0 1 1-1.5Z" />,
  chart: <path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <path d="M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  dashboard: <path d="M4 5h7v6H4V5Zm9 0h7v10h-7V5ZM4 13h7v6H4v-6Zm9 4h7v2h-7v-2Z" />,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  eyeOff: <><path d="m3 3 18 18M10.6 6.1A10.9 10.9 0 0 1 12 6c6 0 9.5 6 9.5 6a18 18 0 0 1-3 3.5M6.2 7.4A18.6 18.6 0 0 0 2.5 12s3.5 6 9.5 6a10 10 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
  lightning: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />,
  lock: <path d="M6 10V7a6 6 0 0 1 12 0v3m-13 0h14v11H5V10Zm7 4v3" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  play: <path d="m9 7 8 5-8 5V7Z" />,
  plus: <path d="M12 5v14m-7-7h14" />,
  search: <path d="m20 20-4.5-4.5m2.5-4A6.5 6.5 0 1 1 5 11.5a6.5 6.5 0 0 1 13 0Z" />,
  settings: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-3.5.9-1.8-2-3.4-2 .1a7 7 0 0 0-1.5-.9L13.5 4h-4L8.6 6a7 7 0 0 0-1.5.9l-2-.1-2 3.4L4 12l-.9 1.8 2 3.4 2-.1a7 7 0 0 0 1.5.9l.9 2h4l.9-2a7 7 0 0 0 1.5-.9l2 .1 2-3.4L19 12Z" />,
  sparkles: <path d="m12 2 1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15ZM4 15l.7 2.3L7 18l-2.3.7L4 21l-.7-2.3L1 18l2.3-.7L4 15Z" />,
  target: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-4 8-8" />,
  users: <path d="M16 20a4 4 0 0 0-8 0m4-7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 7a3 3 0 0 0-3-3m1-4a3 3 0 1 0 0-6" />,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20" {...props}>
      {paths[name]}
    </svg>
  );
}
