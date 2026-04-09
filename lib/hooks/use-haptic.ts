"use client";

import { useCallback } from "react";

/**
 * Returns a haptic() function that vibrates the phone when called.
 * Falls back silently on devices that don't support it (iOS Safari, desktop).
 */
export function useHaptic() {
  const haptic = useCallback((pattern: VibratePattern = 8) => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore — not critical
    }
  }, []);

  return haptic;
}
