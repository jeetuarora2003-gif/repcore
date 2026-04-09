"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      richColors
      toastOptions={{
        style: {
          background: "#111111",
          border: "1px solid #1F1F1F",
          color: "#F5F7FB",
        },
      }}
    />
  );
}
