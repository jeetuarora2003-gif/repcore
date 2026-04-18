import { cn } from "@/lib/utils/cn";

type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { icon: number; text: string; sub: string }> = {
  sm: { icon: 28, text: "text-base", sub: "text-[10px]" },
  md: { icon: 36, text: "text-xl", sub: "text-xs" },
  lg: { icon: 44, text: "text-2xl", sub: "text-sm" },
};

type LogoProps = {
  size?: LogoSize;
  showTagline?: boolean;
  className?: string;
};

export function Logo({ size = "md", showTagline = false, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Dumbbell icon in accent circle */}
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-glow"
        style={{ width: s.icon + 8, height: s.icon + 8 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={s.icon - 6}
          height={s.icon - 6}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14.4 14.4 9.6 9.6" />
          <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
          <path d="m21.5 21.5-1.4-1.4" />
          <path d="M3.9 3.9 2.5 2.5" />
          <path d="M6.404 2.515a2 2 0 0 0-2.829 2.828l1.768 1.767a2 2 0 0 0-2.829 2.829l6.364 6.364a2 2 0 0 0 2.829-2.829l-1.767-1.768a2 2 0 0 0 2.829-2.828z" />
        </svg>
      </div>
      {/* Wordmark */}
      <div>
        <p className={cn("font-bold leading-none tracking-tight text-white", s.text)}>
          Rep<span className="text-accent">Core</span>
        </p>
        {showTagline && (
          <p className={cn("mt-0.5 text-muted-foreground", s.sub)}>
            Gym management, simplified
          </p>
        )}
      </div>
    </div>
  );
}
