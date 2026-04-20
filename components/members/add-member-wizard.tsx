"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { 
  UserPlus, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  X, 
  Camera, 
  Phone, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parseISO } from "date-fns";
import { createMembershipSaleAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

type Plan = { 
  id: string; 
  name: string; 
  duration_days: number;
  price_paise: number;
  is_popular?: boolean;
};

export function AddMemberWizard({ plans }: { plans: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [biometricDeviceId, setBiometricDeviceId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [gender, setGender] = useState("");
  
  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    return plans.find(p => p.is_popular)?.id || plans[0]?.id || "";
  });
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [customAmount, setCustomAmount] = useState("");

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const totalFee = selectedPlan ? selectedPlan.price_paise / 100 : 0;
  const amountToCollect = isFullPayment ? totalFee : (Number(customAmount) || 0);
  const expiryDate = selectedPlan 
    ? format(addDays(parseISO(startDate), selectedPlan.duration_days), "dd MMM yyyy") 
    : "";

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const resetWizard = () => {
    setStep(1);
    setSuccess(false);
    setFullName("");
    setPhone("");
    setPhoneError("");
    setBiometricDeviceId("");
    setPhotoUrl("");
    setGender("");
    setPaymentMethod("cash");
    setIsFullPayment(true);
    setCustomAmount("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
  };

  const validatePhone = () => {
    if (phone && phone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit number");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!fullName.trim() || !phone.trim()) {
        toast.error("Name and Phone are required");
        return;
      }
      if (!validatePhone()) return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    
    if (!selectedPlanId) {
       toast.error("Please select a plan");
       return;
    }

    const data = new FormData(formRef.current);
    
    // Explicitly ensure all required fields are in FormData
    data.set("startDate", startDate);
    data.set("planId", selectedPlanId);
    data.set("paymentMethod", paymentMethod);
    data.set("paidAmountRupees", String(amountToCollect));
    data.set("fullName", fullName);
    data.set("phone", phone);
    data.set("photoUrl", photoUrl);
    data.set("gender", gender);
    data.set("biometricDeviceId", biometricDeviceId);

    startTransition(async () => {
      try {
        await createMembershipSaleAction(data);
        setSuccess(true);
      } catch (error: any) {
        toast.error(error.message || "Failed to add member");
      }
    });
  };

  const handleWhatsAppShare = () => {
    const gymName = "RepCore Gym"; // Ideally from settings context
    const message = `Hi ${fullName}, welcome to ${gymName}! Your ${selectedPlan.name} membership is active until ${expiryDate}. See you at the gym! 💪`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

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

      <DialogContent className="sm:max-w-[440px] flex flex-col p-0 max-h-[90dvh] overflow-hidden bg-background border-border">
        {/* Drag Indicator Bar */}
        <div className="flex justify-center pt-2 pb-1 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-white/10" />
        </div>

        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-white/5 shrink-0 space-y-0">
          <DialogTitle className="text-[17px] font-medium">New Member</DialogTitle>
          <button 
            onClick={() => setOpen(false)}
            className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {!success ? (
          <>
            {/* Step Indicator */}
            <div className="px-6 py-6 bg-surface/30">
              <div className="flex items-center justify-between relative px-2">
                {/* Connection Lines */}
                <div className="absolute top-4 left-10 right-10 h-[2px] bg-white/5 -z-10" />
                <div 
                  className="absolute top-4 left-10 h-[2px] bg-accent transition-all duration-500 -z-10" 
                  style={{ width: `${(step - 1) * 45}%` }}
                />

                {[
                  { id: 1, label: "Profile" },
                  { id: 2, label: "Plan" },
                  { id: 3, label: "Payment" }
                ].map((s) => (
                  <div key={s.id} className="flex flex-col items-center gap-2 group">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                      step > s.id ? "bg-green-500 text-white" : 
                      step === s.id ? "bg-accent text-white ring-4 ring-accent/20" : 
                      "bg-white/5 text-muted-foreground border border-white/10"
                    )}>
                      {step > s.id ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium transition-colors duration-300",
                      step === s.id ? "text-accent" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              {/* Hidden Inputs for Bug Fix */}
              <input type="hidden" name="startDate" value={startDate} />
              <input type="hidden" name="planId" value={selectedPlanId} />
              <input type="hidden" name="paymentMethod" value={paymentMethod} />
              <input type="hidden" name="paidAmountRupees" value={amountToCollect} />
              <input type="hidden" name="photoUrl" value={photoUrl} />
              <input type="hidden" name="gender" value={gender} />
              <input type="hidden" name="biometricDeviceId" value={biometricDeviceId} />

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                
                {/* ── STEP 1: Profile ── */}
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <ImageUpload 
                          bucket="member_photos" 
                          name="photoUrl" 
                          onUploadComplete={(url: string) => setPhotoUrl(url)}
                          className="h-16 w-16 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center overflow-hidden"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Add Photo</p>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                          Tap to take a photo or upload from gallery
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-xs text-muted-foreground uppercase tracking-wider">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="h-12 bg-white/5 border-white/10 rounded-xl px-4"
                          required
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number *</Label>
                        <div className="relative">
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            onBlur={validatePhone}
                            placeholder="10-digit mobile number"
                            className={cn(
                              "h-12 bg-white/5 border-white/10 rounded-xl px-4 pl-10",
                              phoneError && "border-red-500/50 focus-visible:ring-red-500/20"
                            )}
                            required
                            disabled={isPending}
                          />
                          <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        </div>
                        {phoneError && <p className="text-[11px] text-red-500 ml-1">{phoneError}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Gender</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "male", label: "Male" },
                            { id: "female", label: "Female" },
                            { id: "other", label: "Other" }
                          ].map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setGender(g.id)}
                              className={cn(
                                "flex items-center justify-center py-2.5 rounded-xl border text-sm font-medium transition-all duration-200",
                                gender === g.id
                                  ? "bg-accent/10 border-accent text-accent shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                              )}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/5 mt-4">
                        <Label htmlFor="biometricDeviceId" className="text-xs text-muted-foreground uppercase tracking-wider">Device Enrollment ID</Label>
                        <Input
                          id="biometricDeviceId"
                          value={biometricDeviceId}
                          onChange={(e) => setBiometricDeviceId(e.target.value)}
                          placeholder="e.g. 007"
                          className="h-12 bg-white/5 border-white/10 rounded-xl px-4"
                          disabled={isPending}
                        />
                        <p className="text-[11px] text-muted-foreground italic">
                          Only needed if you use a fingerprint device
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Plan Selection ── */}
                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Select plan</p>
                      <div className="space-y-3">
                        {plans.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={cn(
                              "w-full min-h-[64px] flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden",
                              selectedPlanId === plan.id 
                                ? "bg-accent/10 border-accent shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                                : "bg-white/5 border-white/5 hover:border-white/10"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{plan.name}</span>
                              <span className="text-xs text-muted-foreground">{plan.duration_days} days</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-base font-mono font-medium tracking-tight">
                                ₹{(plan.price_paise / 100).toLocaleString()}
                              </span>
                            </div>
                            {plan.is_popular && (
                              <div className="absolute top-0 right-0 bg-accent px-2 py-0.5 rounded-bl-lg">
                                <span className="text-[9px] font-bold text-white uppercase tracking-tighter">Popular</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="space-y-2">
                        <Label htmlFor="startDate" className="text-[11px] text-muted-foreground">START DATE</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-10 bg-white/5 border-white/5 rounded-lg text-sm"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground">EXPIRES ON</Label>
                        <div className="h-10 bg-white/5 border-white/5 rounded-lg flex items-center px-3 text-sm text-muted-foreground opacity-70">
                          {expiryDate}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Payment ── */}
                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{selectedPlan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPlan.duration_days} days · Expires {expiryDate}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setStep(2)}
                        className="text-xs font-semibold text-accent hover:underline px-2"
                      >
                        Change
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">Payment method</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: "cash", label: "Cash", icon: Banknote },
                            { id: "upi", label: "UPI", icon: Smartphone },
                            { id: "card", label: "Card", icon: CreditCard },
                            { id: "other", label: "Other", icon: MoreHorizontal }
                          ].map((method) => (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setPaymentMethod(method.id)}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-[10px] font-medium transition-all",
                                paymentMethod === method.id
                                  ? "bg-accent/10 border-accent text-accent"
                                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                              )}
                            >
                              <method.icon className="h-4 w-4" />
                              {method.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Plan fee</span>
                          <span className="text-base font-mono">₹{totalFee.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t border-b border-white/5">
                          <div className="space-y-0.5">
                            <span className="text-sm font-medium">Full payment today</span>
                            <p className="text-[11px] text-muted-foreground">Record entire amount as received</p>
                          </div>
                          <Switch 
                            checked={isFullPayment} 
                            onCheckedChange={setIsFullPayment}
                            className="data-[state=checked]:bg-accent"
                          />
                        </div>

                        {!isFullPayment && (
                          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <Label htmlFor="customAmount" className="text-xs font-medium">Amount collecting today (₹)</Label>
                            <Input
                              id="customAmount"
                              type="number"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                              placeholder={String(totalFee)}
                              className="h-10 bg-white/5 border-white/10 rounded-lg font-mono"
                            />
                            {totalFee - (Number(customAmount) || 0) > 0 && (
                              <p className="text-[10px] text-orange-400 font-medium italic">
                                Remaining ₹{(totalFee - (Number(customAmount) || 0)).toLocaleString()} will be recorded as due
                              </p>
                            )}
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold">Collecting today</span>
                          <span className="text-xl font-bold font-mono text-accent">₹{amountToCollect.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-6 pt-2 shrink-0">
                {step < 3 ? (
                  <Button 
                    type="button" 
                    onClick={handleNext} 
                    className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-base group"
                  >
                    {step === 1 ? "Next: Choose Plan" : "Next: Payment"}
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1 h-12 rounded-xl border-white/10 bg-white/5"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="flex-[2] h-12 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-base"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Finish & Add Member
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </>
        ) : (
          /* SUCCESS SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-10 w-10 text-accent animate-in scale-110 duration-700" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Member Added!</h2>
              <p className="text-lg font-medium text-white/90">{fullName}</p>
              <p className="text-sm text-muted-foreground">
                {selectedPlan.name} membership active until {expiryDate}
              </p>
            </div>

            <div className="w-full space-y-3 pt-6">
              <Button 
                onClick={handleWhatsAppShare}
                className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#22c35e] text-white font-semibold"
              >
                Share Receipt on WhatsApp
              </Button>
              <Button 
                variant="outline"
                onClick={resetWizard}
                className="w-full h-12 rounded-xl border-white/10 bg-white/5"
              >
                Add Another Member
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
