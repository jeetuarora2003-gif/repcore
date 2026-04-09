import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, CreditCard, MessageSquareText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionContext } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSessionContext();

  if (session.user && !session.gym) {
    redirect("/setup");
  }

  if (session.user && session.gym) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-hero-grid bg-hero-grid">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-12 px-5 py-10 sm:px-8 lg:px-10">
        <div className="panel-muted inline-flex w-fit items-center gap-2 self-start rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-accent" />
          Built for independent Indian gyms
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">RepCore</p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Your gym. <span className="text-gradient">Fully in control.</span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Members managed. Fees collected. Reminders ready. Built for Indian gyms, not imported chaos.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-2xl px-6 text-sm font-semibold">
                <Link href="/signup">
                  Start RepCore
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-2xl px-6 text-sm font-semibold">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: CreditCard, title: "Fees tracked", body: "Partial payments, dues, receipts, and credit without the mess." },
                { icon: MessageSquareText, title: "WhatsApp ready", body: "One-tap reminders on Basic. Automation waits behind Growth." },
                { icon: BarChart3, title: "Fast insights", body: "Expiring members, monthly revenue, pending dues in one glance." },
              ].map((item) => (
                <div key={item.title} className="panel p-4">
                  <item.icon className="mb-4 h-5 w-5 text-accent" />
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel relative overflow-hidden p-5 sm:p-6">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-accent/20 via-accent/10 to-transparent" />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Live preview</p>
                  <h2 className="mt-2 text-xl font-semibold">RepCore dashboard</h2>
                </div>
                <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  Mobile first
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="panel-muted p-4">
                  <p className="text-xs text-muted-foreground">Active members</p>
                  <p className="mt-3 text-3xl font-semibold">164</p>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-xs text-muted-foreground">Collected this month</p>
                  <p className="mt-3 text-3xl font-semibold">INR 1,28,000</p>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-xs text-muted-foreground">Expiring this week</p>
                  <p className="mt-3 text-3xl font-semibold text-warning">9</p>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-xs text-muted-foreground">Pending dues</p>
                  <p className="mt-3 text-3xl font-semibold text-danger">INR 13,500</p>
                </div>
              </div>

              <div className="panel-muted space-y-3 p-4">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-black/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Rahul Sharma</p>
                    <p className="text-xs text-muted-foreground">Membership expires in 2 days</p>
                  </div>
                  <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">Remind</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border bg-black/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Aman Fitness Club</p>
                    <p className="text-xs text-muted-foreground">INR 2,000 payment recorded just now</p>
                  </div>
                  <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">Paid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
