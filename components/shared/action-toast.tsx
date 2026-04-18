"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

/**
 * Reads ?success= and ?error= from the URL and fires a toast, then cleans the URL.
 * Mount this inside any server page that redirects with these params.
 */
export function ActionToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      toast.success(decodeURIComponent(success));
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState(null, "", url.toString());
    }

    if (error) {
      toast.error(decodeURIComponent(error));
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState(null, "", url.toString());
    }
  }, [searchParams]);

  return null;
}
