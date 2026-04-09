"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveMembershipAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, X, AlertTriangle } from "lucide-react";

export function ArchiveMemberButton({ membershipId }: { membershipId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
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
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to archive member");
      } finally {
        setShowConfirm(false);
      }
    });
  };

  return (
    <>
      {/* Confirmation Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-[#0f0f0f] p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-danger/15 p-3">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Archive Member?</h2>
                <p className="text-xs text-muted-foreground">This action cannot be easily undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This member will be removed from your active list and will no longer receive reminders.
              Their payment history will be preserved in your records.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-2xl bg-danger hover:bg-danger/90 text-white"
                onClick={handleArchive}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {isPending ? "Archiving..." : "Yes, archive"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="border-danger/30 text-danger hover:bg-danger/10"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Archive member
      </Button>
    </>
  );
}
