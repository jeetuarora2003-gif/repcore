"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Button> & {
  pendingLabel?: string;
};

export function SubmitButton({ children, pendingLabel, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{pendingLabel ?? "Please wait..."}</>
      ) : children}
    </Button>
  );
}
