"use client";

import { useTransition } from "react";
import { MessageCircleMore } from "lucide-react";
import { markReminderSentAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

type ReminderWhatsappButtonProps = {
  subscriptionId: string;
  stage: 5 | 3 | 1;
  whatsappUrl: string;
  children?: React.ReactNode;
  className?: string;
};

export function ReminderWhatsappButton({
  subscriptionId,
  stage,
  whatsappUrl,
  children,
  className,
}: ReminderWhatsappButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      className={className}
      disabled={isPending}
      onClick={() => {
        // Open WhatsApp first
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        // Then mark reminder as sent server-side
        startTransition(async () => {
          const fd = new FormData();
          fd.set("subscriptionId", subscriptionId);
          fd.set("stage", String(stage));
          await markReminderSentAction(fd);
        });
      }}
    >
      <MessageCircleMore className="h-4 w-4" />
      {children ?? "Send Reminder"}
    </Button>
  );
}
