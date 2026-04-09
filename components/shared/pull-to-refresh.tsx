"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const PULL_THRESHOLD = 72; // px before triggering refresh

export function PullToRefresh() {
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0); // 0 → PULL_THRESHOLD
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        setPull(Math.min(delta * 0.5, PULL_THRESHOLD));
      }
    };

    const onTouchEnd = () => {
      if (pull >= PULL_THRESHOLD && !refreshing) {
        setRefreshing(true);
        try { navigator.vibrate?.(20); } catch {}
        router.refresh();
        setTimeout(() => {
          setRefreshing(false);
          setPull(0);
        }, 1000);
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, router]);

  if (pull === 0 && !refreshing) return null;

  const progress = Math.min(pull / PULL_THRESHOLD, 1);
  const opacity = refreshing ? 1 : progress;
  const scale = refreshing ? 1 : 0.6 + 0.4 * progress;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center transition-all duration-200 lg:hidden"
      style={{ transform: `translateY(${refreshing ? 8 : pull * 0.3}px)` }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-lg"
        style={{ opacity, transform: `scale(${scale})` }}
      >
        <Loader2
          className="h-5 w-5 text-accent"
          style={{
            animation: refreshing ? "spin 0.7s linear infinite" : "none",
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
}
