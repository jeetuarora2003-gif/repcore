import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-28 animate-pulse">
      {/* ZONE 1 - Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 opacity-40" />
          <Skeleton className="h-7 w-48 opacity-60" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full opacity-40" />
      </div>

      {/* ZONE 2 - Pulse Bar Skeleton */}
      <div className="rounded-2xl border border-white/5 bg-white/5 h-[104px] flex divide-x divide-white/5">
        <div className="flex-1 p-4 flex flex-col items-center justify-center space-y-2">
          <Skeleton className="h-7 w-12 opacity-60" />
          <Skeleton className="h-3 w-16 opacity-40" />
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center space-y-2">
          <Skeleton className="h-7 w-16 opacity-60" />
          <Skeleton className="h-3 w-12 opacity-40" />
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center space-y-2">
          <Skeleton className="h-7 w-8 opacity-60" />
          <Skeleton className="h-3 w-14 opacity-40" />
        </div>
      </div>

      {/* ZONE 3 - KPI Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-[88px] w-full rounded-2xl opacity-40" />
        ))}
      </div>

      {/* ZONE 4 - Quick Check-in Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 ml-1 opacity-40" />
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-2xl opacity-60" />
          <Skeleton className="h-12 w-28 rounded-2xl opacity-80" />
        </div>
      </div>

      {/* ZONE 5 - Urgency Section Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-4 w-32 opacity-40" />
          <Skeleton className="h-4 w-12 opacity-40" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl opacity-40" />
      </div>

      {/* ZONE 6 - Feed Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-32 ml-1 opacity-40" />
        <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0 opacity-40" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 opacity-50" />
                <Skeleton className="h-3 w-1/2 opacity-30" />
              </div>
              <Skeleton className="h-4 w-12 opacity-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
