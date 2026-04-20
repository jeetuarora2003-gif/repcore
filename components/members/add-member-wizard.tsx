"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createMembershipSaleAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Plan = { id: string; name: string; duration_days: number };

export function AddMemberWizard({ plans }: { plans: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Track fields needed for cross-step carry or conditional rendering
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString("en-CA"));

  const resetWizard = () => {
    setStep(1);
    setFullName("");
    setPhone("");
    setPlanId(plans[0]?.id ?? "");
    setPaidAmount("0");
    setPaymentMethod("cash");
    setStartDate(new Date().toLocaleDateString("en-CA"));
    formRef.current?.reset();
  };

  const handleNext = () => {
    if (step === 1 && (!fullName.trim() || !phone.trim())) {
      toast.error("Name and Phone are required");
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startTransition(async () => {
      try {
        await createMembershipSaleAction(data);
        toast.success("Member added successfully!");
        resetWizard();
        setOpen(false);
      } catch (error: Error | any) {
        toast.error(error.message || "Failed to add member");
      }
    });
  };

  const selectedPlan = plans.find((p) => p.id === planId) || plans[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetWizard();
        setOpen(val);
      }}
    >
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-40 flex h-14 w-14 lg:h-auto lg:w-auto lg:px-5 lg:py-3.5 items-center justify-center rounded-2xl lg:rounded-full bg-accent text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 active:scale-95 transition-all duration-300"
          title="Add Member"
        >
          <UserPlus className="h-6 w-6 lg:mr-2.5 lg:h-5 lg:w-5" />
          <span className="hidden lg:inline font-semibold">New Member</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[440px] flex flex-col p-0 max-h-[90dvh] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  step >= s ? "bg-accent" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* Single form — all fields live here */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* ── STEP 1: Profile ── */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rahul Sharma"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biometricDeviceId">
                    Device Enrollment ID{" "}
                    <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="biometricDeviceId"
                    name="biometricDeviceId"
                    placeholder="e.g. 007"
                    disabled={isPending}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The number assigned in your fingerprint/face device.
                  </p>
                </div>
                <ImageUpload bucket="member_photos" name="photoUrl" label="Member Photo" />
              </div>
            )}

            {/* ── STEP 2: Plan ── */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Carry profile values as hidden inputs */}
                <input type="hidden" name="fullName" value={fullName} />
                <input type="hidden" name="phone" value={phone} />

                <div className="space-y-2">
                  <Label htmlFor="planId">Select Plan *</Label>
                  <select
                    id="planId"
                    name="planId"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    required
                    disabled={isPending}
                    className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.duration_days} days)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPlan && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm">
                    <p className="font-medium text-accent">{selectedPlan.name}</p>
                    <p className="mt-1 text-muted-foreground">{selectedPlan.duration_days} days</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <input type="hidden" name="saleReason" value="new_join" />
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Carry all previous values */}
                <input type="hidden" name="fullName" value={fullName} />
                <input type="hidden" name="phone" value={phone} />
                <input type="hidden" name="planId" value={planId} />
                <input type="hidden" name="startDate" value={startDate} />
                <input type="hidden" name="paymentMethod" value={paymentMethod} />
                <input type="hidden" name="saleReason" value="new_join" />

                <div className="space-y-2">
                  <Label htmlFor="paidAmountRupees">Amount Paying Now (₹)</Label>
                  <Input
                    id="paidAmountRupees"
                    name="paidAmountRupees"
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    required
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter 0 to create the invoice without recording a payment now.
                  </p>
                </div>

                {Number(paidAmount) > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <select
                        id="paymentMethod"
                        name="paymentMethod"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        disabled={isPending}
                        className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentReference">
                        Reference Code{" "}
                        <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="paymentReference"
                        name="paymentReference"
                        placeholder="e.g. UPI Ref Number"
                        disabled={isPending}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex justify-between gap-3 shrink-0">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isPending}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
            )}

            {step < 3 ? (
              <Button type="button" onClick={handleNext} disabled={isPending}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {isPending ? "Adding..." : "Finish & Add"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
