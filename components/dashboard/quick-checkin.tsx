"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MemberSearchSelect } from "@/components/shared/member-search-select";
import { markAttendanceAction } from "@/lib/actions";

type Option = { id: string; label: string };

export function DashboardQuickCheckin({ 
  memberships, 
  todayStr 
}: { 
  memberships: Option[]; 
  todayStr: string; 
}) {
  const [selectedId, setSelectedId] = useState("");

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium px-1">Quick check-in</p>
      <form action={markAttendanceAction} className="flex gap-2">
        <div className="flex-1 min-w-0">
          <MemberSearchSelect
            name="membershipId"
            memberships={memberships}
            onChange={(id) => setSelectedId(id)}
          />
          <input type="hidden" name="checkInDate" value={todayStr} />
        </div>
        <Button 
          type="submit" 
          disabled={!selectedId}
          className="h-[48px] px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-glow shrink-0 transition-all"
        >
          Check In
        </Button>
      </form>
    </div>
  );
}
