import {
  BarChart3,
  BellRing,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  HelpCircle,
} from "lucide-react";

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: UsersRound },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/attendance", label: "Attendance", icon: UserRound },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/subscription", label: "Subscription", icon: ShieldCheck },
  { href: "/help", label: "Help Center", icon: HelpCircle },
] as const;
