import { redirect } from "next/navigation";
import { isBefore, startOfDay, parseISO } from "date-fns";
import { AppShell } from "@/components/layout/app-shell";
import { PlatformLockScreen } from "@/components/shared/platform-lock-screen";
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

  // PLATFORM SOFTWARE LOCK
  const endDateStr = session.gymSubscription.current_period_end;
  let isLockedOut = false;
  
  if (endDateStr) {
    const endDate = startOfDay(parseISO(endDateStr));
    const today = startOfDay(new Date());
    if (isBefore(endDate, today)) {
      isLockedOut = true;
    }
  }

  if (isLockedOut) {
    return (
      <PlatformLockScreen 
        gymName={session.gym.name} 
        tier={session.gymSubscription.tier} 
        amountDue={session.gymSubscription.tier === "growth" ? 499 : 299} 
      />
    );
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
