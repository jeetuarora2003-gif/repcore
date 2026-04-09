"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveMembershipAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";

export function ArchiveMemberButton({ membershipId }: { membershipId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleArchive = () => {
    const formData = new FormData();
    formData.append("membershipId", membershipId);
    formData.append("archiveReason", "Manual archive by owner");

    startTransition(async () => {
      try {
        await archiveMembershipAction(formData);
        toast.success("Member archived successfully");
        router.push("/members");
      } catch (error: any) {
        toast.error(error.message || "Failed to archive member");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-danger/30 text-danger hover:bg-danger/10" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Archive member
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl border-border bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will archive the member. They will no longer appear in your active member list or receive reminders.
            Their historical data will be preserved for your reports.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            className="rounded-2xl bg-danger hover:bg-danger/90 text-white"
          >
            Yes, archive member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
