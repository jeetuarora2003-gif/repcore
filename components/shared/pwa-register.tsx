"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        // 1. Manual check for update when app is opened
        registration.update();

        // 2. Add listener for new SW version
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content is available and will be used after reload
                window.location.reload();
              }
            };
          }
        };
      }).catch(() => undefined);

      // 3. Handle controller change (safety net)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }
  }, []);

  return null;
}
