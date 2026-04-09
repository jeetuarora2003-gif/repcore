import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LockedGrowthCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card className="overflow-hidden border-accent/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-accent/10 p-3 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{body}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Basic keeps manual WhatsApp. Growth handles the sending for you.</p>
        <Button asChild variant="outline">
          <Link href="/settings">View current plan</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
