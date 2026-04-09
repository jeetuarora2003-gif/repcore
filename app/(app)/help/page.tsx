import { HelpCircle, Mail, MessageSquare, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  const contactOptions = [
    { title: "WhatsApp Support", value: "+91 99999 99999", href: "https://wa.me/919999999999", icon: MessageSquare, description: "Fastest response for technical issues." },
    { title: "Email Support", value: "support@repcore.app", href: "mailto:support@repcore.app", icon: Mail, description: "For billing or account queries." },
    { title: "Call Hub", value: "788854681", href: "tel:788854681", icon: Phone, description: "Emergency assistance for your gym." },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Need help?</h1>
        <p className="text-muted-foreground">We are here to ensure your gym never stops running.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {contactOptions.map((opt) => (
          <a key={opt.title} href={opt.href} target={opt.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background rounded-xl">
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
          <CardTitle>Frequent Staff Training</CardTitle>
          <CardDescription>Common guide for your front desk staff.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="panel-muted p-4 space-y-2">
            <h3 className="font-medium">How to record a new payment?</h3>
            <p className="text-sm text-muted-foreground">Go to Billing, select the member, and tap &quot;Collect via QR&quot; or &quot;Record Cash&quot;. The invoice is automatically balanced.</p>
          </div>
          <div className="panel-muted p-4 space-y-2">
            <h3 className="font-medium">Managing expiring memberships</h3>
            <p className="text-sm text-muted-foreground">The Dashboard shows &quot;Expiring this week&quot;. Tap the WhatsApp icon on their profile to send a one-click reminder.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
