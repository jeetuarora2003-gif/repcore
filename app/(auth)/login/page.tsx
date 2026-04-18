import { Suspense } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/submit-button";
import { LoginError } from "@/components/auth/login-error";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in to RepCore</CardTitle>
        <CardDescription>Pick up where your gym left off.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={loginAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="owner@gym.com" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" size="sm" className="text-[12px] text-accent hover:underline font-medium">Forgot password?</Link>
            </div>
            <Input id="password" name="password" type="password" placeholder="Enter your password" required />
          </div>
          <Suspense fallback={null}>
            <LoginError />
          </Suspense>
          <SubmitButton className="w-full" pendingLabel="Signing in...">
            Sign in
          </SubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to RepCore?{" "}
          <Link href="/signup" className="font-medium text-accent">Create your account</Link>
        </p>
      </CardContent>
    </Card>
  );
}
