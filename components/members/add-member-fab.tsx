"use client";

import { UserPlus } from "lucide-react";
import { AddMemberWizard } from "@/components/members/add-member-wizard";
import type { MembershipPlanRecord } from "@/lib/db/queries";

export function AddMemberFab({ plans }: { plans: any[] }) {
  // We use the existing AddMemberWizard which already has a Dialog trigger.
  // Actually, wait, AddMemberWizard has the trigger built-in.
  // We will just render AddMemberWizard here, but this file is meant to house the FAB.
  // Since AddMemberWizard has the trigger built-in, we can just use AddMemberWizard,
  // but let's make sure the trigger in AddMemberWizard matches the design.
  return <AddMemberWizard plans={plans} />;
}
