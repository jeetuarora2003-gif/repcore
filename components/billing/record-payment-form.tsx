"use client";

import { useState, useTransition } from "react";
import { Banknote, CreditCard, Landmark, Loader2, QrCode, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordPaymentAction } from "@/lib/actions";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

interface Membership {
  id: string;
  members: {
    full_name: string;
    phone: string;
  };
}

interface Invoice {
  invoice_id: string;
  membership_id: string;
  invoice_number: string;
  amount_due_paise: number;
  derived_status: string;
}

interface Props {
  memberships: Membership[];
  invoices: Invoice[];
  initialMembershipId?: string;
  gymName: string;
  upiVpa?: string | null;
}

export function RecordPaymentForm({ memberships, invoices, initialMembershipId, gymName, upiVpa }: Props) {
  const [selectedMembershipId, setSelectedMembershipId] = useState(initialMembershipId || memberships[0]?.id || "");
  const [method, setMethod] = useState<"upi" | "cash" | "bank_transfer" | "card" | "other">("upi");
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const selectedInvoices = invoices.filter(
    (inv) => inv.membership_id === selectedMembershipId && inv.derived_status !== "paid" && inv.derived_status !== "voided"
  );
  
  const selectedMember = memberships.find(m => m.id === selectedMembershipId);
  const defaultAmount = selectedInvoices[0] ? selectedInvoices[0].amount_due_paise / 100 : "";
  const [amount, setAmount] = useState(defaultAmount.toString());

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const form = document.getElementById("record-payment-form") as HTMLFormElement;
    const formData = new FormData(form);
    
    formData.set("method", method);
    
    startTransition(async () => {
      try {
        await recordPaymentAction(formData);
        setShowQr(false);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        alert("Error recording payment: " + message);
      }
    });
  };

  const upiUrl = upiVpa ? `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(gymName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Gym fee - ${selectedMember?.members.full_name || ""}`)}` : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  const paymentMethods = [
    { id: "upi", label: "UPI", icon: QrCode, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: "cash", label: "Cash", icon: Banknote, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "bank_transfer", label: "Bank", icon: Landmark, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "card", label: "Card", icon: CreditCard, color: "text-pink-500", bg: "bg-pink-500/10" },
  ];

  return (
    <div className="space-y-6">
      <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Member Selection */}
        <div className="space-y-2">
          <Label htmlFor="membershipId" className="text-xs uppercase tracking-wider text-muted-foreground">Select Member</Label>
          <select
            id="membershipId"
            name="membershipId"
            value={selectedMembershipId}
            onChange={(e) => setSelectedMembershipId(e.target.value)}
            required
            className="flex h-12 w-full rounded-2xl border border-border bg-surface px-4 py-2 text-base text-foreground focus:ring-2 focus:ring-accent"
          >
            {memberships.map((m) => (
              <option key={m.id} value={m.id}>
                {m.members.full_name} ({m.members.phone})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Amount & Quick Selection */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount Received</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">₹</span>
            <Input 
              id="amountRupees" 
              name="amountRupees" 
              type="number" 
              step="0.01" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 pl-8 text-2xl font-bold rounded-2xl border-2 border-accent/20 focus:border-accent"
              required 
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedInvoices.length > 0 && (
              <button
                type="button"
                onClick={() => setAmount((selectedInvoices[0].amount_due_paise / 100).toString())}
                className="rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
              >
                Pay Balance ({formatCurrency(selectedInvoices[0].amount_due_paise)})
              </button>
            )}
            {[500, 1000, 2000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className="rounded-full bg-white/[0.05] px-4 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.1]"
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Method Selection */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment Method</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setMethod(pm.id as any)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all",
                  method === pm.id 
                    ? "border-accent bg-accent/5 ring-4 ring-accent/10" 
                    : "border-border bg-white/[0.02] hover:border-border-hover hover:bg-white/[0.05]"
                )}
              >
                <div className={cn("rounded-full p-2", pm.bg)}>
                  <pm.icon className={cn("h-5 w-5", pm.color)} />
                </div>
                <span className="text-xs font-semibold">{pm.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Action Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
              <button 
                  type="button" 
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground underline transition-colors"
              >
                  {showDetails ? "Hide extra details" : "Add ref / date / notes"}
              </button>
          </div>

          {showDetails && (
              <div className="grid gap-4 rounded-2xl bg-white/[0.02] p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                      <Label htmlFor="receivedOn" className="text-xs">Date Received</Label>
                      <Input id="receivedOn" name="receivedOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="referenceCode" className="text-xs">Reference (UTR/Transaction ID)</Label>
                      <Input id="referenceCode" name="referenceCode" placeholder="Enter UTR if UPI" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="note" className="text-xs">Staff Note</Label>
                      <Input id="note" name="note" placeholder="Any extra info..." />
                  </div>
              </div>
          )}

          {!showDetails && (
              <>
                  <input type="hidden" name="receivedOn" value={new Date().toISOString().slice(0, 10)} />
              </>
          )}
          <input type="hidden" name="allocationInvoiceId" value={selectedInvoices[0]?.invoice_id || ""} />
          <input type="hidden" name="allocationAmountRupees" value={amount} />

          {method === "upi" && upiVpa ? (
            <Button 
              type="button" 
              onClick={() => setShowQr(true)}
              className="h-14 w-full rounded-2xl bg-purple-600 text-lg font-bold text-white shadow-glow hover:bg-purple-700"
            >
              <Smartphone className="mr-2 h-5 w-5" />
              Collect via Dynamic QR
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isPending}
              className={cn(
                "h-14 w-full rounded-2xl text-lg font-bold text-white shadow-glow",
                method === "cash" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-accent hover:bg-accent/90"
              )}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>Record {method === "cash" ? "Cash" : ""} ₹{amount || "0"} Receipt</>
              )}
            </Button>
          )}

          {method === "upi" && upiVpa && (
            <button 
              type="button"
              onClick={() => handleSubmit()}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:underline"
            >
              UPI already received? Record manually
            </button>
          )}
        </div>
      </form>

      {/* QR Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowQr(false)}
              className="absolute right-4 top-4 rounded-full bg-black/5 p-2 text-black transition-colors hover:bg-black/10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600">{gymName}</p>
              <h3 className="mt-2 text-2xl font-black text-black">Scan to Pay ₹{amount}</h3>
              
              <div className="mt-6 flex justify-center rounded-3xl bg-white p-4 shadow-inner ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="UPI QR Code" className="h-48 w-48" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 grayscale brightness-50 opacity-40">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" alt="UPI" className="h-4 object-contain mx-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="h-4 object-contain mx-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg" alt="Paytm" className="h-4 object-contain mx-auto" />
              </div>

              <p className="mt-8 text-sm font-medium text-black/60">
                Accepted via GPay, PhonePe, Paytm, or any UPI app.
              </p>

              <Button 
                onClick={() => handleSubmit()}
                disabled={isPending}
                className="mt-6 h-12 w-full rounded-2xl bg-black font-bold text-white hover:bg-black/90"
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm & Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
