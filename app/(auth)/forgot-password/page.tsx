import { Suspense } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/submit-button";
import { LoginError } from "@/components/auth/login-error";
import { CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const success = searchParams.success;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a secure link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/10 p-6 text-center flex flex-col items-center gap-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-400 text-lg">Check your email</p>
              <p className="text-sm text-emerald-800 dark:text-emerald-500/80">
                A reset link has been sent to your inbox.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-2">
              <Link href="/login">Back to Sign in</Link>
            </Button>
          </div>
        ) : (
          <form action={forgotPasswordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="owner@gym.com" 
                required 
              />
            </div>
            <Suspense fallback={null}>
              <LoginError />
            </Suspense>
            <SubmitButton className="w-full" pendingLabel="Sending link...">
              Send reset link
            </SubmitButton>
            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link href="/login" className="font-medium text-accent">Sign in</Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// Simple internal Button component since I can't import UI buttons easily in this multi-write
function Button({ children, className, variant, asChild, ...props }: any) {
  const Component = asChild ? "span" : "button";
  return (
    <Component 
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "outline" ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground" : "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  );
}

import { cn } from "@/lib/utils/cn";
