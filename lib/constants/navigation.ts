import {
  BarChart3,
  BellRing,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: UsersRound },
  { href: "/subscriptions", label: "Subscriptions", icon: ListChecks },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/attendance", label: "Attendance", icon: UserRound },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
