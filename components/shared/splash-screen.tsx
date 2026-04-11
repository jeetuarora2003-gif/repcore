"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fade-out after 800ms
    const fadeTimer = setTimeout(() => setFading(true), 800);
    // Remove from DOM after fade completes (300ms transition)
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          animation: "splashPop 400ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <img
          src="/icon.svg"
          alt="RepCore"
          width={100}
          height={100}
          style={{ borderRadius: "22px" }}
        />
      </div>
      <style>{`
        @keyframes splashPop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
