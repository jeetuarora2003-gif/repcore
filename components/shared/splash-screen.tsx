"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 800);
    const hideTimer = setTimeout(() => setVisible(false), 1100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#16181d",
        transition: "opacity 300ms ease",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          animation: "splashPop 400ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <img
          src="/icon.png"
          alt="RepCore"
          width={110}
          height={110}
          style={{ borderRadius: "24px", display: "block" }}
        />
      </div>
      <style>{`
        @keyframes splashPop {
          from { opacity: 0; transform: scale(0.75); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
