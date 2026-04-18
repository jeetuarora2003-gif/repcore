"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle, ExternalLink, Settings } from "lucide-react";

export function LoginError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  
  if (!error) return null;

  const isRateLimit = error.toLowerCase().includes("rate limit") || error.toLowerCase().includes("too many requests");

  return (
    <div className="space-y-3">
      {/* Primary Error Message */}
      <p className="text-sm font-medium text-danger flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {error}
      </p>

      {/* Admin Troubleshooting Tip for Rate Limits */}
      {isRateLimit && (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-muted-foreground">
          <div className="flex items-center gap-2 mb-2 text-white font-semibold">
            <Settings className="h-3.5 w-3.5 text-accent" />
            Admin Troubleshooting Tip
          </div>
          <p>
            Supabase Free Tier limits signups to 3 per hour. To fix this:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Go to <span className="text-white">Supabase Dashboard &gt; Auth &gt; Settings</span></li>
            <li>Turn <span className="text-accent underline font-medium">OFF</span> "Confirm Email"</li>
            <li>Increase "Emails per Hour" in Rate Limits</li>
          </ul>
        </div>
      )}
    </div>
  );
}
