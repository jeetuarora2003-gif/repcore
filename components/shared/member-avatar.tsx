import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type MemberAvatarProps = {
  name: string;
  photoUrl?: string | null;
  status?: "active" | "expiring_soon" | "expired" | "lapsed" | "archived" | "frozen" | string;
  className?: string;
};

export function MemberAvatar({ name, photoUrl, status = "default", className }: MemberAvatarProps) {
  if (photoUrl) {
    return (
      <div className={cn("relative flex-shrink-0 overflow-hidden rounded-full", className)} style={{ width: 44, height: 44 }}>
        <Image src={photoUrl} alt={name} fill className="object-cover" sizes="44px" />
      </div>
    );
  }

  // Calculate initials
  const parts = name.trim().split(" ");
  let initials = "";
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length === 1 && parts[0].length === 1) {
    initials = parts[0].toUpperCase();
  } else {
    initials = "?";
  }

  let bgClass = "bg-surface text-muted-foreground"; // default
  let style: React.CSSProperties = { width: 44, height: 44 };

  if (status.includes("active")) {
    style = { ...style, backgroundColor: "#C0DD97", color: "#27500A" };
  } else if (status.includes("expiring")) {
    style = { ...style, backgroundColor: "#FAC775", color: "#633806" };
  } else if (status.includes("lapsed") || status.includes("expired")) {
    style = { ...style, backgroundColor: "#F7C1C1", color: "#791F1F" };
  } else {
    // fallback uses standard generic background
    bgClass = "bg-secondary text-secondary-foreground";
  }

  return (
    <div
      className={cn("flex flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold", bgClass, className)}
      style={style}
    >
      {initials}
    </div>
  );
}
