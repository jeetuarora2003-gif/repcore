"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { navigationItems } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import type { AppRole, GymTier } from "@/lib/types/app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { Logo } from "@/components/shared/logo";


type AppShellProps = {
  gymName: string;
  role: AppRole;
  tier: GymTier;
  userEmail: string;
  children: React.ReactNode;
};

const BOTTOM_NAV_HREFS = ["/dashboard", "/members", "/billing", "/attendance"];

export function AppShell({ gymName, role, tier, userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const navItems = navigationItems.filter((item) => !(role !== "owner" && item.href === "/settings"));
  const bottomNavItems = navItems.filter((item) => BOTTOM_NAV_HREFS.includes(item.href));
  const avatarText = (userEmail.split("@")[0] ?? userEmail).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border bg-black/30 px-4 py-6 lg:flex lg:flex-col">
        <div className="panel-muted flex items-center gap-3 px-4 py-3">
          <Logo size="sm" />
          <div className="ml-auto">
            <p className="text-[10px] font-medium text-muted-foreground">RepCore {tier === "growth" ? "Growth" : "Basic"}</p>
            <p className="truncate text-xs font-semibold text-foreground">{gymName}</p>
          </div>
        </div>
        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                  active ? "bg-accent text-white shadow-glow" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto panel-muted p-4">
          <Badge variant={tier === "growth" ? "accent" : "default"}>{tier === "growth" ? "Growth" : "Basic"}</Badge>
          <p className="mt-3 text-sm font-medium">Role: {role === "owner" ? "Owner" : "Front desk"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Your gym. Fully in control.</p>
          <Button asChild variant="outline" className="mt-4 w-full justify-between">
            <a href="/logout">Sign out<LogOut className="h-4 w-4" /></a>
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="mobile-top-safe sticky top-0 z-40 border-b border-border bg-black/60 px-4 pb-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button variant="outline" size="icon" className="rounded-2xl"><Menu className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-3"><item.icon className="h-4 w-4" />{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <Separator className="my-2" />
                <DropdownMenuItem asChild>
                  <a href="/logout" className="flex items-center gap-3 text-danger"><LogOut className="h-4 w-4" />Sign out</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{gymName}</p>
              <p className="text-xs text-muted-foreground">{role === "owner" ? "Owner access" : "Front desk access"}</p>
            </div>
            <div className="flex items-center gap-3">
              {role === "owner" ? (
                <Link href="/settings/subscription">
                  <Badge variant={tier === "growth" ? "accent" : "default"} className="cursor-pointer hover:opacity-80 active:scale-95 transition-all">{tier === "growth" ? "Growth" : "Basic"}</Badge>
                </Link>
              ) : (
                <Badge variant={tier === "growth" ? "accent" : "default"}>{tier === "growth" ? "Growth" : "Basic"}</Badge>
              )}
              <Link href="/settings" className="flex items-center gap-3 group active:scale-95 transition-all">
                <div className="hidden text-right sm:block group-hover:opacity-80 transition-opacity">
                  <p className="text-sm font-medium">{userEmail}</p>
                  <p className="text-xs text-muted-foreground">Signed in</p>
                </div>
                <Avatar className="h-11 w-11 border border-border group-hover:border-accent/40 shadow-sm transition-all text-sm font-medium">
                  <AvatarFallback>{avatarText}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>

        {/* pb-[calc(env(safe-area-inset-bottom)+8rem)] ensures content clears the bottom nav + safe area on all devices */}
        <main className="mobile-safe flex-1 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+8rem)] sm:px-6 lg:px-8 lg:py-8 lg:pb-8">{children}</main>

        <PullToRefresh />


        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-black/85 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-lg lg:hidden">
          <div className="grid grid-cols-4 gap-2">
            {bottomNavItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all duration-200 active:scale-90",
                    active ? "bg-accent/15 text-accent active:bg-accent/25" : "text-muted-foreground active:bg-white/5",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
