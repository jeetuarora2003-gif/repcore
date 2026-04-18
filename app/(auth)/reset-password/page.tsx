import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordClient } from "@/components/auth/reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>
          Choose a strong password to secure your RepCore account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordClient />
      </CardContent>
    </Card>
  );
}
