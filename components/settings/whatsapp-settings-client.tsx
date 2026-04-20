"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Check, CreditCard, ExternalLink, Info, Loader2, Phone, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { addCreditsAction, updateReminderModeAction, updateWhatsappConfigAction } from "@/lib/actions";
import { toast } from "sonner";

type WhatsappSettingsClientProps = {
  gym: any;
  balance: number;
  transactions: any[];
  razorpayKey: string | undefined;
};

export default function WhatsappSettingsClient({
  gym,
  balance,
  transactions,
  razorpayKey,
}: WhatsappSettingsClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "auto">(gym.whatsapp_reminder_mode || "manual");
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number>(100);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleModeChange = async (newMode: "manual" | "auto") => {
    if (newMode === mode) return;
    setIsUpdatingMode(true);
    try {
      const formData = new FormData();
      formData.append("mode", newMode);
      await updateReminderModeAction(formData);
      setMode(newMode);
      toast.success(`Switched to ${newMode} reminders`);
    } catch (err) {
      toast.error("Failed to update reminder mode");
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdatingConfig(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append("mode", mode);
      await updateWhatsappConfigAction(formData);
      toast.success("WhatsApp configuration updated");
      router.refresh();
    } catch (err) {
      toast.error("Failed to update configuration");
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const initiatePayment = async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedPreset;
    if (isNaN(amount) || amount < 50) {
      toast.error("Minimum top-up is ₹50");
      return;
    }

    setIsTopupLoading(true);
    try {
      // 1. Create order on server (simplified for this task: we'll use a direct Razorpay checkout and verify on completion)
      // In a real app, you'd call an action to get an orderId from Razorpay API.
      // Since we don't have a separate createOrder action yet, we'll assume the back-end handles verification.
      
      const options = {
        key: razorpayKey,
        amount: amount * 100, // paise
        currency: "INR",
        name: "RepCore",
        description: `WhatsApp Credits Top-up · ${gym.name}`,
        handler: async function (response: any) {
          const formData = new FormData();
          formData.append("amountPaise", (amount * 100).toString());
          formData.append("razorpayOrderId", response.razorpay_order_id || "direct_pay");
          formData.append("razorpayPaymentId", response.razorpay_payment_id);
          formData.append("razorpaySignature", response.razorpay_signature);
          
          try {
            await addCreditsAction(formData);
            toast.success("Credits added successfully!");
            router.refresh();
          } catch (err) {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        prefill: {
          name: gym.name,
          contact: gym.whatsapp_phone_number || "",
        },
        theme: {
          color: "#2563EB",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error("Failed to initiate payment");
    } finally {
      setIsTopupLoading(false);
    }
  };

  const estimatedMessages = Math.floor(balance / 15);

  return (
    <div className="space-y-8 pb-20">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/settings" className="hover:text-foreground transition-colors group">
          <span className="group-hover:-translate-x-1 inline-block transition-transform mr-1">←</span> Settings
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Reminders</h1>
        <p className="mt-2 text-muted-foreground">Choose how you want to send member reminders</p>
      </header>

      {/* Mode Selector */}
      <section className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => handleModeChange("manual")}
          disabled={isUpdatingMode}
          className={cn(
            "relative flex flex-col text-left rounded-3xl border-2 p-5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
            mode === "manual" 
              ? "border-accent bg-accent/5 ring-1 ring-accent/20" 
              : "border-border bg-white/[0.02] hover:bg-white/[0.04] opacity-80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
              mode === "manual" ? "border-accent bg-accent text-white" : "border-muted-foreground"
            )}>
              {mode === "manual" && <Check className="h-4 w-4" />}
            </span>
            <Badge variant="success" className="bg-[#EAF3DE] text-[#2D4511] border-[#D1E1BB]">Free forever</Badge>
          </div>
          <h3 className="mt-4 font-bold text-lg">Manual reminders</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            You tap Send for each member. RepCore opens WhatsApp with the message pre-written — you just hit send.
          </p>
        </button>

        <button
          onClick={() => handleModeChange("auto")}
          disabled={isUpdatingMode}
          className={cn(
            "relative flex flex-col text-left rounded-3xl border-2 p-5 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
            mode === "auto" 
              ? "border-accent bg-accent/5 ring-1 ring-accent/20" 
              : "border-border bg-white/[0.02] hover:bg-white/[0.04] opacity-80"
          )}
        >
          <div className="flex items-center justify-between">
             <span className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
              mode === "auto" ? "border-accent bg-accent text-white" : "border-muted-foreground"
            )}>
              {mode === "auto" && <Check className="h-4 w-4" />}
            </span>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Uses message credits</Badge>
          </div>
          <h3 className="mt-4 font-bold text-lg">Auto reminders</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            RepCore sends messages automatically on day 5, 3, and 1 before expiry — even when you're not online.
          </p>
          {isUpdatingMode && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/20 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}
        </button>
      </section>

      {/* Auto Setup Section */}
      {mode === "auto" && (
        <Card className="panel border-accent/20 bg-accent/[0.02]">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Automated Setup
            </CardTitle>
            <CardDescription>Configure your WhatsApp documentation and API credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Setup Checklist */}
            <div className="rounded-2xl border border-border/50 bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                Setup Checklist
              </h4>
              <ul className="space-y-4 text-xs">
                <li className="flex gap-3">
                   <div className="flex-none flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-[10px]">1</div>
                   <div>
                     <p className="font-medium">Get a WhatsApp Business API key</p>
                     <p className="text-muted-foreground mt-0.5">Use AiSensy.com or Gupshup. It only takes 5 minutes to sign up.</p>
                   </div>
                </li>
                <li className="flex gap-3">
                   <div className="flex-none flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-[10px]">2</div>
                   <div className="space-y-2">
                     <p className="font-medium">Create message templates in AiSensy</p>
                     <div className="bg-black/40 rounded-xl p-3 border border-border font-mono text-[10px] space-y-2 text-accent/80">
                        <div>
                          <p className="text-muted-foreground mb-1">// Template 1</p>
                          <p>Name: <span className="text-white">repcore_reminder_5</span></p>
                          <p className="mt-1 break-words italic">"Hi [Name], your membership at [Gym] expires in 5 days on [Date]. Renew soon to avoid interruption."</p>
                        </div>
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-muted-foreground mb-1">// Template 2</p>
                          <p>Name: <span className="text-white">repcore_reminder_3</span></p>
                        </div>
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-muted-foreground mb-1">// Template 3</p>
                          <p>Name: <span className="text-white">repcore_reminder_1</span></p>
                        </div>
                     </div>
                     <p className="text-muted-foreground">The names MUST match exactly. Use 4 params: Name, Gym, Date, Stage.</p>
                   </div>
                </li>
              </ul>
            </div>

            <form onSubmit={handleConfigSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp Business Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      name="phone" 
                      placeholder="+91 98765 43210" 
                      className="pl-10 h-11 rounded-xl"
                      defaultValue={gym.whatsapp_phone_number || ""}
                      required 
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground px-1">Must be registered on WhatsApp Business API</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key (AiSensy or Gupshup)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        id="apiKey" 
                        name="apiKey" 
                        type={showApiKey ? "text" : "password"}
                        placeholder="Paste your API key here" 
                        className="h-11 rounded-xl pr-10"
                        required 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <Info className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Link href="https://aisensy.com" target="_blank" className="text-[11px] text-accent flex items-center gap-1 px-1 hover:underline">
                    Get it from AiSensy.com (free to sign up) <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>

              <Button type="submit" disabled={isUpdatingConfig} className="w-full sm:w-auto h-11 rounded-2xl px-8 shadow-glow">
                {isUpdatingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <zap className="mr-2 h-4 w-4" />}
                Save & Activate Auto Reminders
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Message Credits Section */}
      <section className="space-y-6">
        <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-200/80 leading-relaxed">
            RepCore charges you nothing extra. WhatsApp (Meta) charges ~₹0.15 per automated message. 
            We pass this cost at exact rate — zero markup. Credits are only used when Auto mode is on.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="panel bg-white/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Message credits
                </CardTitle>
                {balance < 2000 && <Badge variant="destructive" className="animate-pulse">Low balance</Badge>}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold font-mono tracking-tight">{formatCurrency(balance)}</span>
                <span className="text-sm text-muted-foreground font-medium">remaining</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent font-medium inline-flex items-center gap-2">
                <Zap className="h-3 w-3" /> ~{estimatedMessages} messages remaining
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground text-center">
                For a 200-member gym, auto reminders cost roughly ₹20–80 per month
              </p>
            </CardContent>
          </Card>

          <Card className="panel border-accent/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Add Credits</CardTitle>
              <CardDescription>Top up your wallet to ensure uninterrupted automation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setSelectedPreset(amt);
                      setCustomAmount("");
                    }}
                    className={cn(
                      "h-10 rounded-xl border text-sm font-medium transition-all",
                      selectedPreset === amt && !customAmount
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-border bg-white/5 hover:bg-white/10"
                    )}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom" className="text-xs">Or custom amount (min ₹50)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                  <Input 
                    id="custom" 
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount" 
                    className="pl-7 h-10 rounded-xl" 
                  />
                </div>
              </div>

              <Button 
                onClick={initiatePayment} 
                className="w-full h-11 bg-success hover:bg-success/90 text-success-foreground rounded-2xl font-bold shadow-glow"
                disabled={isTopupLoading}
              >
                {isTopupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add credits via UPI →"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Transaction History */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold">Recent credit activity</h3>
        <Card className="panel overflow-hidden">
          <div className="divide-y divide-border/40">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(tx.created_at, "dd MMM yyyy · HH:mm")}</p>
                  </div>
                  <div className={cn(
                    "font-mono text-sm font-bold",
                    tx.type === "topup" ? "text-success" : "text-muted-foreground"
                  )}>
                    {tx.type === "topup" ? "+" : "−"}{formatCurrency(tx.amount_paise)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No activity yet</p>
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
