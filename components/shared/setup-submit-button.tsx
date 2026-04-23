"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SetupSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      size="lg" 
      disabled={pending}
      className="min-w-[160px] font-bold rounded-2xl transition-all"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Setting up...
        </>
      ) : (
        "Finish setup"
      )}
    </Button>
  );
}
