"use client";

import { useEffect, useState, Suspense } from "react";
import { updatePasswordAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { LoginError } from "@/components/auth/login-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ShieldAlert, Loader2 } from "lucide-react";

export function ResetPasswordClient() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Check if we have a session. The /auth/confirm route should have already established one.
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      } else {
        // Fallback: maybe the PASSWORD_RECOVERY event is still to come if they were sent here with a hash
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            setReady(true);
          }
        });
        
        // Final timeout error
        const timer = setTimeout(() => {
          if (!ready) setError("No active reset session found. Please request a new link.");
        }, 3000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timer);
        };
      }
    }

    checkSession();
  }, [supabase.auth, ready]);

  if (error) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 text-red-500" />
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
        <p className="text-sm text-muted-foreground">Preparing secure environment...</p>
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
