"use client";

import { useState, useTransition } from "react";
import { recordBodyMeasurementAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

interface Props {
  membershipId: string;
}

export function BodyMeasurementForm({ membershipId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await recordBodyMeasurementAction(membershipId, formData);
        setIsOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      }
    });
  };

  if (!isOpen) {
    return (
      <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-border p-8">
        <p className="text-muted-foreground">Track weight, body fat, and muscle progress.</p>
        <Button onClick={() => setIsOpen(true)} className="mt-4 h-12 rounded-2xl bg-accent shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          Log measurements
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-border bg-white/[0.02] p-6 animate-in fade-in zoom-in-95">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="weightKg">Weight (kg)</Label>
          <Input id="weightKg" name="weightKg" type="number" step="0.1" placeholder="e.g. 75.5" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bodyFatPercentage">Body Fat %</Label>
          <Input id="bodyFatPercentage" name="bodyFatPercentage" type="number" step="0.1" placeholder="e.g. 18.2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="chestCm">Chest (cm)</Label>
          <Input id="chestCm" name="chestCm" type="number" step="0.1" placeholder="e.g. 102.0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="waistCm">Waist (cm)</Label>
          <Input id="waistCm" name="waistCm" type="number" step="0.1" placeholder="e.g. 84.0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bicepsCm">Biceps (cm)</Label>
          <Input id="bicepsCm" name="bicepsCm" type="number" step="0.1" placeholder="e.g. 38.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recordedOn">Log Date</Label>
          <Input id="recordedOn" name="recordedOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
        <Button type="submit" disabled={isPending} className="bg-accent shadow-glow">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save progress"}
        </Button>
      </div>
    </form>
  );
}
