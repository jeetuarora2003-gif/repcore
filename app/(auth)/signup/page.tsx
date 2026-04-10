import { Suspense } from "react";
import Link from "next/link";
import { signupAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/submit-button";
import { LoginError } from "@/components/auth/login-error";

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create RepCore account</CardTitle>
        <CardDescription>Set up your gym and start running cleaner operations.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signupAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" placeholder="Aman Singh" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="owner@gym.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="Minimum 6 characters" required />
          </div>
          <Suspense fallback={null}>
            <LoginError />
          </Suspense>
          <SubmitButton className="w-full" pendingLabel="Creating account...">
            Continue
          </SubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already using RepCore?{" "}
          <Link href="/login" className="font-medium text-accent">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
