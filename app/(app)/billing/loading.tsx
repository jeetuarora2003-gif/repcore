import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* ZONE 1 - Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* ZONE 2 - Today's Summary */}
      <Skeleton className="h-48 w-full rounded-3xl" />

      {/* ZONE 3 - KPI & Chart */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
        <Skeleton className="h-44 w-full rounded-3xl" />
      </div>

      {/* ZONE 4 - Pending Dues */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
