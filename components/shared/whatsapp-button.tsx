"use client";

import { useTransition } from "react";
import { MessageCircleMore } from "lucide-react";
import { logManualReminderAction } from "@/lib/actions";
import { Button, type ButtonProps } from "@/components/ui/button";

type WhatsappButtonProps = ButtonProps & {
  membershipId: string;
  subscriptionId?: string;
  invoiceId?: string;
  templateId?: string;
  recipientPhone: string;
  renderedBody: string;
  whatsappUrl: string;
};

export function WhatsappButton({
  membershipId,
  subscriptionId,
  invoiceId,
  templateId,
  recipientPhone,
  renderedBody,
  whatsappUrl,
  children,
  ...props
}: WhatsappButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      {...props}
      onClick={() => {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        startTransition(async () => {
          await logManualReminderAction({
            membershipId,
            subscriptionId,
            invoiceId,
            templateId,
            recipientPhone,
            renderedBody,
            whatsappUrl,
          });
        });
      }}
      disabled={isPending || props.disabled}
    >
      <MessageCircleMore className="h-4 w-4" />
      {children ?? "Send reminder"}
    </Button>
  );
}
