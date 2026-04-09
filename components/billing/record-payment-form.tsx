"use client";

import { useMemo, useState, useTransition } from "react";
import { Banknote, CreditCard, Landmark, Loader2, Smartphone } from "lucide-react";
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
}

const paymentMethods = [
  { id: "upi", label: "UPI", icon: Smartphone, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "cash", label: "Cash", icon: Banknote, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "bank_transfer", label: "Bank", icon: Landmark, color: "text-sky-500", bg: "bg-sky-500/10" },
  { id: "card", label: "Card", icon: CreditCard, color: "text-pink-500", bg: "bg-pink-500/10" },
  { id: "other", label: "Other", icon: Smartphone, color: "text-slate-400", bg: "bg-slate-500/10" },
] as const;

type PaymentMethod = (typeof paymentMethods)[number]["id"];

export function RecordPaymentForm({ memberships, invoices, initialMembershipId, gymName }: Props) {
  const [selectedMembershipId, setSelectedMembershipId] = useState(initialMembershipId || memberships[0]?.id || "");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);
  const [amount, setAmount] = useState("");

  const selectedInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.membership_id === selectedMembershipId &&
          invoice.derived_status !== "paid" &&
          invoice.derived_status !== "voided",
      ),
    [invoices, selectedMembershipId],
  );

  const selectedMember = memberships.find((membership) => membership.id === selectedMembershipId);
  const dueAmount = selectedInvoices[0]?.amount_due_paise ?? 0;
  const displayAmount = amount || (dueAmount ? String(dueAmount / 100) : "");

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();

    const form = document.getElementById("record-payment-form") as HTMLFormElement | null;
    if (!form) return;

    const formData = new FormData(form);
    formData.set("method", method);
    formData.set("amountRupees", displayAmount || "0");

    startTransition(async () => {
      try {
        await recordPaymentAction(formData);
        setAmount("");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        alert(`Error recording payment: ${message}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="membershipId" className="text-xs uppercase tracking-wider text-muted-foreground">
            Select member
          </Label>
          <select
            id="membershipId"
            name="membershipId"
            value={selectedMembershipId}
            onChange={(event) => {
              setSelectedMembershipId(event.target.value);
              setAmount("");
            }}
            required
            className="flex h-12 w-full rounded-2xl border border-border bg-surface px-4 py-2 text-base text-foreground focus:ring-2 focus:ring-accent"
          >
            {memberships.map((membership) => (
              <option key={membership.id} value={membership.id}>
                {membership.members.full_name} ({membership.members.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount received</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
              Rs.
            </span>
            <Input
              id="amountRupees"
              name="amountRupees"
              type="number"
              step="0.01"
              value={displayAmount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-14 pl-12 text-2xl font-bold rounded-2xl border-2 border-accent/20 focus:border-accent"
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {dueAmount > 0 ? (
              <button
                type="button"
                onClick={() => setAmount(String(dueAmount / 100))}
                className="rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
              >
                Pay balance ({formatCurrency(dueAmount)})
              </button>
            ) : null}
            {[500, 1000, 2000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className="rounded-full bg-white/[0.05] px-4 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.1]"
              >
                Rs. {value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment method</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {paymentMethods.map((paymentMethod) => (
              <button
                key={paymentMethod.id}
                type="button"
                onClick={() => setMethod(paymentMethod.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all",
                  method === paymentMethod.id
                    ? "border-accent bg-accent/5 ring-4 ring-accent/10"
                    : "border-border bg-white/[0.02] hover:border-border hover:bg-white/[0.05]",
                )}
              >
                <div className={cn("rounded-full p-2", paymentMethod.bg)}>
                  <paymentMethod.icon className={cn("h-5 w-5", paymentMethod.color)} />
                </div>
                <span className="text-xs font-semibold">{paymentMethod.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {showDetails ? "Hide extra details" : "Add ref / date / notes"}
          </button>

          {showDetails ? (
            <div className="grid gap-4 rounded-2xl bg-white/[0.02] p-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label htmlFor="receivedOn" className="text-xs">
                  Date received
                </Label>
                <Input
                  id="receivedOn"
                  name="receivedOn"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceCode" className="text-xs">
                  Reference (UTR / transaction ID)
                </Label>
                <Input id="referenceCode" name="referenceCode" placeholder="Enter UTR if available" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note" className="text-xs">
                  Staff note
                </Label>
                <Input id="note" name="note" placeholder={`Payment recorded for ${gymName}`} />
              </div>
            </div>
          ) : (
            <input type="hidden" name="receivedOn" value={new Date().toISOString().slice(0, 10)} />
          )}

          <input type="hidden" name="allocationInvoiceId" value={selectedInvoices[0]?.invoice_id || ""} />
          <input type="hidden" name="allocationAmountRupees" value={displayAmount || "0"} />

          {method === "upi" ? (
            <p className="rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-xs text-muted-foreground">
              UPI collection in V1 is recorded manually. Collect in your preferred UPI app, then save the payment here with the reference code.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isPending}
            className={cn(
              "h-14 w-full rounded-2xl text-lg font-bold text-white shadow-glow",
              method === "cash" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-accent hover:bg-accent/90",
            )}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>Record {method === "cash" ? "cash" : "payment"} for Rs. {displayAmount || "0"}</>
            )}
          </Button>
        </div>
      </form>

      {selectedMember ? (
        <div className="rounded-2xl border border-border bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
          Recording payment for <span className="font-medium text-foreground">{selectedMember.members.full_name}</span>.
        </div>
      ) : null}
    </div>
  );
}
