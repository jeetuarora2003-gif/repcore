"use client";

import { useState, useMemo } from "react";
import { Search, UsersRound, UserX } from "lucide-react";
import { MembersSummaryBar } from "./members-summary-bar";
import { MemberCard } from "./member-card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { useRouter, useSearchParams } from "next/navigation";

// The server fetches all non-archived members by default, or ONLY archived members if tab=archived.
type MembersClientProps = {
  members: any[]; // The fully populated members from getMembersPageData
  gymName: string;
};

export function MembersClient({ members, gymName }: MembersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") || "all";
  
  const [search, setSearch] = useState("");

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    if (newTab === "all") {
      params.delete("tab");
    } else {
      params.set("tab", newTab);
    }
    router.push(`/members?${params.toString()}`);
  };

  // Derive counts from members list (only accurate if we have the full non-archived list)
  // If the server gave us Archived members, this won't be accurate for Active/etc., 
  // but we shouldn't show active/lapsed counts when viewing the purely archived list anyway.
  const activeCount = useMemo(() => members.filter(m => m.status === "active").length, [members]);
  const expiringCount = useMemo(() => members.filter(m => m.status === "expiring_soon").length, [members]);
  const lapsedCount = useMemo(() => members.filter(m => m.status === "lapsed").length, [members]);
  const totalCount = useMemo(() => members.filter(m => m.status !== "archived").length, [members]);

  const counts = { active: activeCount, expiring: expiringCount, lapsed: lapsedCount, total: totalCount };

  // Filter the list based on Search + URL Tab
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // 1. Search matching
      if (search) {
        const query = search.toLowerCase();
        const matchesName = m.members.full_name.toLowerCase().includes(query);
        const matchesPhone = m.members.phone.includes(query);
        if (!matchesName && !matchesPhone) return false;
      }

      // 2. Tab matching
      if (urlTab === "active") return m.status === "active";
      if (urlTab === "expiring") return m.status === "expiring_soon";
      if (urlTab === "lapsed") return m.status === "lapsed";
      if (urlTab === "archived") return m.status === "archived";
      
      // "all" tab matches everything provided (usually non-archived)
      return true;
    });
  }, [members, search, urlTab]);

  // Sort Order (All tab or when not specifically tabbed):
  // 1. Lapsed (unpaid, expired)
  // 2. Expiring in 1 day
  // 3. Expiring in 3 days
  // 4. Expiring in 5 days
  // 5. Active (alphabetical)
  
  const sortedMembers = useMemo(() => {
    const getDaysRemaining = (m: any) => {
      const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const todayIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
      if (!m.currentSubscription) return 999;
      const endDate = new Date(m.currentSubscription.effective_end_date + "T00:00:00+05:30");
      const endDateLocal = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const diffMs = endDateLocal.getTime() - todayIST.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    };

    return [...filteredMembers].sort((a, b) => {
      // Prioritize lapsed
      if (a.status === "lapsed" && b.status !== "lapsed") return -1;
      if (b.status === "lapsed" && a.status !== "lapsed") return 1;

      // Prioritize expiring
      if (a.status === "expiring_soon" && b.status === "expiring_soon") {
         return getDaysRemaining(a) - getDaysRemaining(b);
      }
      if (a.status === "expiring_soon" && b.status !== "expiring_soon") return -1;
      if (b.status === "expiring_soon" && a.status !== "expiring_soon") return 1;

      // Active alphabetical
      return a.members.full_name.localeCompare(b.members.full_name);
    });
  }, [filteredMembers]);

  return (
    <div className="space-y-6">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-xl sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input 
            className="pl-10 h-12 rounded-xl border-border bg-surface text-base shadow-sm" 
            placeholder="Search by name or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          Showing {sortedMembers.length} {search || urlTab !== "all" ? "matching " : ""}member{sortedMembers.length !== 1 ? "s" : ""}
        </p>
      </div>

      <MembersSummaryBar counts={counts} currentTab={urlTab} onTabChange={handleTabChange} />

      {sortedMembers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedMembers.map((member) => (
            <MemberCard key={member.id} member={member} gymName={gymName} />
          ))}
        </div>
      ) : (
        <div className="pt-8 w-full max-w-md mx-auto">
          {urlTab === "archived" ? (
             <EmptyState 
                icon={<UserX className="h-8 w-8" />} 
                title="No archived members" 
                body="Archived members will appear here." 
             />
          ) : urlTab === "lapsed" ? (
             <EmptyState 
                icon={<UserX className="h-8 w-8" />} 
                title="No lapsed members" 
                body="Members who expire with unpaid dues will automatically move here." 
             />
          ) : search ? (
             <EmptyState 
                icon={<Search className="h-8 w-8" />} 
                title="No results found" 
                body={`We couldn't find anyone matching "${search}".`} 
             />
          ) : (
             <EmptyState 
                icon={<UsersRound className="h-8 w-8" />} 
                title="No members yet" 
                body="Add your first member to get started." 
             />
          )}
        </div>
      )}
    </div>
  );
}
