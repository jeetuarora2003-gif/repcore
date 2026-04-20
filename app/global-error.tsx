"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global crash logged:", error.message, error.stack);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Something went critically wrong!</h2>
          <div className="bg-red-950 p-4 rounded text-left overflow-auto max-w-full text-xs font-mono">
            <strong>Error Digest:</strong> {error.digest}<br />
            <strong>Error Message:</strong> {error.message}<br />
            <strong>Stack Trace:</strong>
            <pre className="mt-2 text-red-300">{error.stack}</pre>
          </div>
          <Button
            onClick={() => reset()}
            className="mt-6"
          >
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
