"use client";

import { cn } from "@/lib/utils/cn";

type TabCounts = {
  active: number;
  expiring: number;
  lapsed: number;
  total: number;
};

type SummaryBarProps = {
  counts: TabCounts;
  currentTab: string;
  onTabChange: (tab: string) => void;
};

export function MembersSummaryBar({ counts, currentTab, onTabChange }: SummaryBarProps) {
  const tabs = [
    { id: "active", label: "Active", count: counts.active, activeBg: "bg-success text-success-foreground hover:bg-success/90" },
    { id: "expiring", label: "Expiring", count: counts.expiring, activeBg: "bg-warning text-warning-foreground hover:bg-warning/90" },
    { id: "lapsed", label: "Lapsed", count: counts.lapsed, activeBg: "bg-danger text-danger-foreground hover:bg-danger/90" },
    { id: "all", label: "Total", count: counts.total, activeBg: "bg-primary text-primary-foreground hover:bg-primary/90" },
  ];

  return (
    <div className="flex w-full overflow-x-auto pb-2 hide-scrollbar">
      <div className="flex items-center gap-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive ? tab.activeBg : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "flex items-center justify-center rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-black/20 text-current" : "bg-white/10"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}

        {/* We also need a way to reach Archived tab, since it's not in the main counts but the user wants an Archived tab in the main status tabs. Wait, the user specifically designed the Summary bar for Active | Expiring | Lapsed | Total.
          Status Tabs: All | Active | Expiring | Lapsed | Archived. 
          The summary bar acts as a tab filter too (Tapping a pill activates that tab filter).
        */}
        <button
          onClick={() => onTabChange("archived")}
          className={cn(
             "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
             currentTab === "archived" ? "bg-muted text-muted-foreground" : "bg-transparent text-muted-foreground/60 hover:text-muted-foreground"
          )}
        >
          Archived
        </button>
      </div>
    </div>
  );
}
