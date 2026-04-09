import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSessionContext } from "@/lib/auth/session";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionContext();

  if (!session.user) {
    redirect("/login");
  }

  if (!session.gym || !session.gymUser || !session.gymSubscription) {
    redirect("/setup");
  }

  return (
    <AppShell
      gymName={session.gym.name}
      role={session.gymUser.role}
      tier={session.gymSubscription.tier}
      userEmail={session.user.email ?? "user@repcore.app"}
    >
      {children}
    </AppShell>
  );
}
