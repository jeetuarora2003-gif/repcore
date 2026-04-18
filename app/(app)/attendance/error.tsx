"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AttendanceError]", error);
  }, [error]);

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-6 rounded-2xl border border-danger/20 bg-danger/5 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
        <AlertTriangle className="h-7 w-7 text-danger" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold">Attendance failed to load</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error.message.includes("unique") || error.message.includes("constraint")
            ? "A database constraint error occurred. Please ensure migration 0003_attendance_fix.sql has been applied to your Supabase project."
            : error.message || "An unexpected error occurred while loading attendance data."}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
