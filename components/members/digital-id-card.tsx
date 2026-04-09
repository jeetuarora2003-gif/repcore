import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { Activity, ShieldCheck, User } from "lucide-react";

interface Props {
  member: {
    fullName: string;
    photoUrl?: string | null;
    status: string;
    expiresAt?: string | null;
    gymName: string;
    gymLogo?: string | null;
  };
}

export function DigitalIdCard({ member }: Props) {
  const isActive = ["active", "expiring_soon", "frozen"].includes(member.status);
  
  return (
    <div className="relative mx-auto w-full max-w-[340px] aspect-[1/1.58] overflow-hidden rounded-[40px] bg-[#0A0A0A] p-1 shadow-2xl ring-1 ring-white/10">
      {/* Holographic Overlays */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-accent/20 via-accent/5 to-transparent opacity-50" />
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />
      
      {/* Card Content */}
      <div className="relative flex h-full flex-col items-center justify-between border border-white/10 rounded-[38px] p-8">
        
        {/* Header: Gym Identity */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            {member.gymLogo ? (
              <img src={member.gymLogo} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-bold text-xs uppercase">R</div>
            )}
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">{member.gymName}</span>
          </div>
          <ShieldCheck className={cn("h-5 w-5", isActive ? "text-accent" : "text-muted-foreground")} />
        </div>

        {/* Profile Image Area */}
        <div className="relative mt-8">
            <div className="relative z-10 h-44 w-44 overflow-hidden rounded-[2.5rem] border-4 border-white/5 bg-white shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.fullName} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">
                        <User className="h-20 w-20" />
                    </div>
                )}
            </div>
            {/* Visual Echoes */}
            <div className="absolute inset-0 z-0 h-44 w-44 scale-110 blur-2xl opacity-20 bg-accent animate-pulse" />
        </div>

        {/* Member Details */}
        <div className="mt-6 text-center">
            <h2 className="text-2xl font-black tracking-tight text-white">{member.fullName}</h2>
            <div className="mt-3 flex items-center justify-center gap-2">
                <div className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
                    isActive ? "bg-accent" : "bg-zinc-600"
                )} />
                <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em]",
                    isActive ? "text-accent" : "text-zinc-500"
                )}>
                    {member.status.replaceAll("_", " ")}
                </span>
            </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-white/5 pt-8">
            <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Valid Until</p>
                <p className="text-sm font-semibold text-white/90">
                    {member.expiresAt ? formatDate(member.expiresAt) : "N/A"}
                </p>
            </div>
            <div className="space-y-1 text-right">
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Activity</p>
                <div className="flex items-center justify-end gap-1.5">
                    <Activity className="h-3 w-3 text-accent" />
                    <p className="text-sm font-semibold text-white/90">Consistency 85%</p>
                </div>
            </div>
        </div>

        {/* Bottom Banner */}
        <div className="mt-auto pt-6 flex w-full items-center justify-center">
            <p className="text-[8px] uppercase tracking-[0.4em] text-white/20 font-black">REPCORE PREMIER MEMBER</p>
        </div>
      </div>
    </div>
  );
}
