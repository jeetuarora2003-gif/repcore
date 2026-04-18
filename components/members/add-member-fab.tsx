"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load the heavy wizard component
const AddMemberWizard = dynamic(
  () => import("@/components/members/add-member-wizard").then((mod) => mod.AddMemberWizard),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-accent flex items-center justify-center shadow-glow">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    )
  }
);

export function AddMemberFab({ plans }: { plans: any[] }) {
  return <AddMemberWizard plans={plans} />;
}
