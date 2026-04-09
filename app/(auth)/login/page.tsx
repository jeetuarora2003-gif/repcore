import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await getSessionContext();
  if (session.user && session.gym) redirect("/dashboard");
  if (session.user && !session.gym) redirect("/setup");

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
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="Enter your password" required />
          </div>
          {searchParams.error ? <p className="text-sm text-danger">{searchParams.error}</p> : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to RepCore?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Create your account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
