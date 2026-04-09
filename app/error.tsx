"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("GLOBAL ERROR:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-danger/10 text-danger mb-8">
        <div className="absolute inset-0 animate-pulse rounded-3xl bg-danger/5" />
        <AlertTriangle className="h-10 w-10 relative z-10" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground">A technical error occurred</h1>
      <p className="mt-2 max-w-md text-muted-foreground leading-relaxed">
        The application encountered an unexpected issue. Your data is safe, but we need to reload the session.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left">
        <p className="text-xs font-mono text-muted-foreground break-all">
          {error.message || "Unknown error"}
          {error.digest && <span className="block mt-1 opacity-50">Error ID: {error.digest}</span>}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => reset()} className="rounded-2xl h-12 px-8">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button asChild variant="outline" className="rounded-2xl h-12 px-8">
          <a href="/dashboard">Back to Home</a>
        </Button>
      </div>
    </div>
  );
}
