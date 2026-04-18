import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="space-y-6 pb-28">
      <PageHeader 
        title="Members" 
        description="Manage joins, renewals, archives, and member status from one place." 
      />

      {/* Summary Bar Skeleton */}
      <div className="flex w-full overflow-x-hidden pb-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                   <Skeleton className="h-11 w-11 rounded-full" />
                   <div className="space-y-2">
                     <Skeleton className="h-4 w-28" />
                     <Skeleton className="h-3 w-16" />
                   </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              
              <div className="border-y border-border/50 bg-white/[0.02] px-5 py-3 flex items-center justify-between -mx-5 gap-4">
                 <div className="space-y-1.5 flex-1">
                   <Skeleton className="h-3 w-12" />
                   <Skeleton className="h-4 w-20" />
                 </div>
                 <div className="space-y-1.5 flex flex-col items-end flex-1">
                   <Skeleton className="h-3 w-16" />
                   <Skeleton className="h-4 w-12" />
                 </div>
              </div>

              <div className="flex w-full gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
