"use client";

import { Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlatformLockScreen({
  gymName,
  tier,
  amountDue = 499,
}: {
  gymName: string;
  tier: string;
  amountDue?: number;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-danger/30 bg-surface p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-b from-danger/10 to-transparent pointer-events-none" />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-danger/15 text-danger mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-danger/20 opacity-75" />
          <Lock className="h-10 w-10 relative z-10" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">Service Suspended</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {gymName}, your RepCore platform subscription has expired. Access to your gym members, attendance, and billing history is securely locked.
        </p>

        <div className="my-8 rounded-2xl bg-white/[0.03] p-5 text-left border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Plan</span>
            <span className="text-sm font-semibold capitalize text-foreground">{tier} Tier</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-muted-foreground">Amount Due</span>
            <span className="text-lg font-bold text-accent">₹{amountDue}</span>
          </div>
        </div>

        <Button asChild size="lg" className="w-full rounded-2xl bg-accent text-white hover:bg-accent/90 shadow-glow h-14 text-base">
          <a href={`upi://pay?pa=repcore@ybl&pn=RepCore%20Software&am=${amountDue}.00&cu=INR&tn=Account%20Unlock%20${gymName}`}>
            <ShieldAlert className="mr-2 h-5 w-5" />
            Pay via UPI to Unlock
          </a>
        </Button>

        <p className="mt-6 text-xs text-muted-foreground">
          Once payment is complete, your account will be fully unlocked within 60 seconds with zero data loss.
        </p>
      </div>
    </div>
  );
}
