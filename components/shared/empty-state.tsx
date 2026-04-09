"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay so the animation triggers after mount
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`panel flex flex-col items-center justify-center gap-5 px-6 py-16 text-center transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Pulsing icon ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-20 w-20 animate-ping rounded-full bg-accent/10" />
        <div className="relative rounded-3xl bg-accent/10 p-5 text-accent">
          <Icon className="h-8 w-8" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      </div>

      {action && <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">{action}</div>}
    </div>
  );
}
