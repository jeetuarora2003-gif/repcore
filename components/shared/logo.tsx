import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { icon: number; text: string; sub: string }> = {
  sm: { icon: 32, text: "text-base", sub: "text-[10px]" },
  md: { icon: 40, text: "text-xl", sub: "text-xs" },
  lg: { icon: 52, text: "text-2xl", sub: "text-sm" },
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
      {/* Brand Icon (R) */}
      <div
        className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface border border-white/5 shadow-glow"
        style={{ width: s.icon + 4, height: s.icon + 4 }}
      >
        <Image
          src="/icon.png"
          alt="RepCore"
          width={s.icon}
          height={s.icon}
          className="object-contain"
          priority
        />
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
