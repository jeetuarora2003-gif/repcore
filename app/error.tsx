"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Route crash logged:", error.message, error.stack);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4 z-50 fixed inset-0">
      <h2 className="text-2xl font-bold mb-4 text-red-500">RepCore Server-Side Exception</h2>
      <div className="bg-red-950 p-6 rounded text-left overflow-auto max-w-2xl w-full text-xs font-mono whitespace-pre-wrap shadow-xl shadow-red-900/20">
        <strong className="text-red-300">Digest ID:</strong> {error.digest || 'no-digest'}<br /><br />
        <strong className="text-red-300">Error Message:</strong> {error.message || 'Unknown Error'}<br /><br />
        <strong className="text-red-300">Stack Trace:</strong>
        <pre className="mt-2 text-red-100">{error.stack}</pre>
      </div>
      <Button
        onClick={() => reset()}
        className="mt-6 bg-red-600 hover:bg-red-700"
      >
        Try again
      </Button>
    </div>
  );
}
