"use client";

import { useEffect, useState, Suspense } from "react";
import { updatePasswordAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/submit-button";
import { LoginError } from "@/components/auth/login-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";

export function ResetPasswordClient() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Supabase sends a hash like #access_token=... on the redirect.
    // We listen for the PASSWORD_RECOVERY event which triggers when the token is processed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
      
      // If we already have a session and the event is SIGNED_IN, we might also be ready
      if (event === "SIGNED_IN" && session) {
        setReady(true);
      }
    });

    // Timeout fallback: if nothing happens in 5 seconds, show an error
    const timer = setTimeout(() => {
      if (!ready) {
        // We check if there's actually a session already (maybe they refreshed)
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) setReady(true);
          else setError("Reset link expired or invalid. Please request a new one.");
        });
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase.auth, ready]);

  if (error) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldCheck className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-sm font-medium text-red-500">{error}</p>
        <a href="/forgot-password" size="sm" className="text-accent underline">Request new link</a>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Verifying your secure link...</p>
      </div>
    );
  }

  return (
    <form action={updatePasswordAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input 
          id="password" 
          name="password" 
          type="password" 
          placeholder="Enter new password" 
          required 
          autoFocus 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input 
          id="confirmPassword" 
          name="confirmPassword" 
          type="password" 
          placeholder="Repeat new password" 
          required 
        />
      </div>
      <Suspense fallback={null}>
        <LoginError />
      </Suspense>
      <SubmitButton className="w-full" pendingLabel="Saving password...">
        Save and Sign in
      </SubmitButton>
    </form>
  );
}
