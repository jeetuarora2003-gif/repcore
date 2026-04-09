"use client";

import Link from "next/link";
import { useState } from "react";
import { X, TrendingUp, Zap, Trophy, BellOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Types ─── */
interface Props {
  tier: string;
  monthlyRevenue: number;            // paise
  activeMembersCount: number;
  pendingDueAmount: number;         // paise
  expiringCount: number;
  pendingDuesCount: number;          // number of invoices / members with dues
}

function fmt(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/* ─── Value Board ─── always shown, reinforces app ROI ─── */
function ValueBoard({ monthlyRevenue, tier }: { monthlyRevenue: number; tier: string }) {
  return (
    <div className="rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-500/10 to-transparent p-4 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="rounded-xl bg-green-500/15 p-2.5 text-green-400 flex-shrink-0 mt-0.5">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            RepCore helped you collect <span className="text-green-400">{fmt(monthlyRevenue)}</span> this month
          </p>
          <p className="text-xs text-muted-foreground">
            {tier === "basic" ? `On ₹299/month — that's ${Math.round(monthlyRevenue / 100 / 299)}× your investment.` : "Keep the momentum going. Your Growth plan is working."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Sleeping Members Alert ─── Basic only ─── */
function SleepingMembersAlert({ pendingDuesCount, expiringCount, onDismiss }: {
  pendingDuesCount: number;
  expiringCount: number;
  onDismiss: () => void;
}) {
  if (pendingDuesCount === 0 && expiringCount === 0) return null;
  const atRisk = pendingDuesCount + expiringCount;

  return (
    <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-r from-orange-500/10 to-transparent p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-xl bg-orange-500/15 p-2.5 text-orange-400 flex-shrink-0">
            <BellOff className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {atRisk} member{atRisk !== 1 ? "s" : ""} at risk of dropping out
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {expiringCount > 0 && `${expiringCount} expiring this week. `}
              {pendingDuesCount > 0 && `${pendingDuesCount} have unpaid dues. `}
              Growth users automate WhatsApp reminders and recover these members — on Basic, you need to do it manually.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" className="h-8 rounded-xl text-xs">
                <Link href="/reminders">Send reminders now</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-xl text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                <Link href="/settings/subscription">Automate with Growth →</Link>
              </Button>
            </div>
          </div>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Milestone Banner ─── */
function MilestoneBanner({ count, tier, onDismiss }: {
  count: number;
  tier: string;
  onDismiss: () => void;
}) {
  const milestones = [10, 25, 50, 100];
  const hit = milestones.find((m) => count >= m);
  if (!hit) return null;

  return (
    <div className="rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/10 to-transparent p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-xl bg-accent/15 p-2.5 text-accent flex-shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              🎉 You just crossed {hit} active members!
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Gyms at this scale save 4+ hours every week by automating WhatsApp reminders.
              {tier === "basic" && " You're still doing it manually — that's time you could spend on the floor."}
            </p>
            {tier === "basic" && (
              <Button asChild size="sm" className="mt-3 h-8 rounded-xl text-xs">
                <Link href="/settings/subscription">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Unlock Growth — ₹499/mo
                </Link>
              </Button>
            )}
          </div>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Growth Ghost Teaser ─── Basic only, bottom of dashboard ─── */
function GrowthTeaser() {
  return (
    <div className="relative rounded-2xl border border-accent/20 overflow-hidden">
      {/* Blurred ghost preview */}
      <div className="p-4 blur-[3px] select-none pointer-events-none opacity-60 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Automated Reminders — Last 7 days</p>
          <span className="text-xs text-green-400 font-medium">24 sent ✓</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-lg font-bold text-green-400">24</p>
            <p className="text-muted-foreground">Sent</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-lg font-bold text-accent">18</p>
            <p className="text-muted-foreground">Renewed</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-lg font-bold">₹36k</p>
            <p className="text-muted-foreground">Recovered</p>
          </div>
        </div>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[1px] gap-3 p-4 text-center">
        <div className="rounded-2xl bg-accent/15 p-3 text-accent">
          <Zap className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold">Automate your reminders</p>
          <p className="text-xs text-muted-foreground mt-1">Growth users recover an average of ₹8,000 more per month by automating WhatsApp follow-ups.</p>
        </div>
        <Button asChild size="sm" className="rounded-2xl">
          <Link href="/settings/subscription">
            <Sparkles className="mr-1.5 h-3 w-3" />
            Upgrade to Growth — ₹499/mo
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* ─── Master Component ─── */
export function ConversionBanners({
  tier,
  monthlyRevenue,
  activeMembersCount,
  pendingDueAmount,
  expiringCount,
  pendingDuesCount,
}: Props) {
  const DISMISS_KEY_RISK = `repcore-dismiss-risk-${new Date().toDateString()}`;
  const DISMISS_KEY_MILESTONE = `repcore-dismiss-milestone-${activeMembersCount}`;

  const [showRisk, setShowRisk] = useState(true);
  const [showMilestone, setShowMilestone] = useState(true);

  const isBasic = tier !== "growth";

  return (
    <div className="space-y-3">
      {/* 1. Always-on value board */}
      <ValueBoard monthlyRevenue={monthlyRevenue} tier={tier} />

      {/* 2. At-risk members (Basic only) */}
      {isBasic && showRisk && (
        <SleepingMembersAlert
          pendingDuesCount={pendingDuesCount}
          expiringCount={expiringCount}
          onDismiss={() => setShowRisk(false)}
        />
      )}

      {/* 3. Milestone celebration */}
      {showMilestone && (
        <MilestoneBanner
          count={activeMembersCount}
          tier={tier}
          onDismiss={() => setShowMilestone(false)}
        />
      )}

      {/* 4. Growth ghost teaser (Basic only, only if they have members) */}
      {isBasic && activeMembersCount >= 5 && <GrowthTeaser />}
    </div>
  );
}
