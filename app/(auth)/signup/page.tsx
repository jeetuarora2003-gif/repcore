import Link from "next/link";
import { redirect } from "next/navigation";
import { signupAction } from "@/lib/actions";
import { getSessionContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage({
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
          {searchParams.error ? <p className="text-sm text-danger">{searchParams.error}</p> : null}
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already using RepCore?{" "}
          <Link href="/login" className="font-medium text-accent">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
