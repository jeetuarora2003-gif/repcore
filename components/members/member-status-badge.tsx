import { cn } from "@/lib/utils/cn";

export type MemberStatusType = "active" | "expiring_soon" | "expired" | "lapsed" | "archived" | "frozen" | string;

export function MemberStatusBadge({ status, expiryDays }: { status: MemberStatusType; expiryDays?: number | null }) {
  let label = status.replaceAll("_", " ");
  let className = "bg-white/[0.08] text-foreground border-transparent"; // default

  switch (status) {
    case "active":
      className = "bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20";
      break;
    case "expiring_soon":
      className = "bg-warning/15 text-[#633806] border-warning/20";
      if (expiryDays !== undefined && expiryDays !== null) {
        label = `${expiryDays} day${expiryDays === 1 ? "" : "s"} left`;
      }
      break;
    case "lapsed":
      className = "bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]/20";
      break;
    case "expired":
      className = "bg-danger/15 text-danger border-danger/20";
      break;
    case "frozen":
      className = "bg-accent/15 text-accent border-accent/20";
      break;
    case "archived":
      className = "bg-muted text-muted-foreground border-muted-foreground/20";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        className
      )}
    >
      {label}
    </span>
  );
}
