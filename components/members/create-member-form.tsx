"use client";

import { useRef, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createMembershipSaleAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";

type Plan = { id: string; name: string; duration_days: number };

export function CreateMemberForm({ plans }: { plans: Plan[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createMembershipSaleAction(formData);
        toast.success("Member added successfully!");
        formRef.current?.reset();
      } catch (error: Error | any) {
        toast.error(error.message || "Failed to add member");
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Name</Label>
        <Input id="fullName" name="fullName" placeholder="Rahul Sharma" required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" placeholder="9876543210" required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="planId">Plan</Label>
        <select
          id="planId"
          name="planId"
          required
          disabled={isPending}
          className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          defaultValue={plans[0]?.id ?? ""}
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} ({plan.duration_days} days)
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <select
          id="gender"
          name="gender"
          disabled={isPending}
          className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          defaultValue=""
        >
          <option value="" disabled>Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-2 xl:col-span-1">
        <ImageUpload bucket="member_photos" name="photoUrl" label="Member Photo" />
      </div>
      <input type="hidden" name="saleReason" value="new_join" />
      <div className="sm:col-span-2 xl:col-span-4">
        <Button type="submit" disabled={isPending}>
          <UserPlus className="h-4 w-4" />
          {isPending ? "Adding member..." : "Create member and first sale"}
        </Button>
      </div>
    </form>
  );
}
