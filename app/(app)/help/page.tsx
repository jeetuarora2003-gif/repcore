import { Mail, MessageSquare, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  const contactOptions = [
    {
      title: "WhatsApp Support",
      value: "+91 78885 46281",
      href: "https://wa.me/917888546281",
      icon: MessageSquare,
      description: "Fastest response for technical issues.",
    },
    {
      title: "Email Support",
      value: "support@repcore.app",
      href: "mailto:support@repcore.app",
      icon: Mail,
      description: "For billing or account queries.",
    },
    {
      title: "Call Support",
      value: "+91 78885 46281",
      href: "tel:+917888546281",
      icon: Phone,
      description: "Emergency assistance for your gym.",
    },
  ];

  const faqs = [
    {
      q: "How do I record a new payment?",
      a: "Go to Billing, select the member, and tap Record Payment. The invoice is automatically balanced and marked paid.",
    },
    {
      q: "How do I send a WhatsApp reminder?",
      a: "Go to Reminders. All members with dues or expiring memberships appear there. Tap Send on WhatsApp next to any member — it opens WhatsApp with a pre-filled message.",
    },
    {
      q: "How do I renew a membership?",
      a: "Open the member's profile, go to the Billing tab, pick a plan and tap Renew subscription. The new subscription starts right after the current one ends.",
    },
    {
      q: "How do I freeze a membership?",
      a: "Open the member's profile, go to the Billing tab, and use the Freeze option. Set the start and end date. Their subscription end date will automatically extend.",
    },
    {
      q: "How do I archive a member?",
      a: "Open the member's profile, go to the Overview tab, and tap Archive member at the bottom of the profile form.",
    },
    {
      q: "Where do I see expiring members?",
      a: "The Dashboard shows Expiring this week. Go to Reminders to bulk message all expiring members at once.",
    },
  ];

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Need help?</h1>
        <p className="text-muted-foreground">We are here to ensure your gym never stops running.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {contactOptions.map((opt) => (
          <a
            key={opt.title}
            href={opt.href}
            target={opt.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="block focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background rounded-xl"
          >
            <Card className="panel hover:border-accent/40 transition-colors h-full">
              <CardHeader>
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <opt.icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-4">{opt.title}</CardTitle>
                <CardDescription>{opt.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground underline decoration-accent/30 underline-offset-4">{opt.value}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Common Questions</CardTitle>
          <CardDescription>Quick answers for your front desk staff.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="panel-muted p-4 space-y-2">
              <h3 className="font-medium">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
