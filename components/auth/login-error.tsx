"use client";

import { useSearchParams } from "next/navigation";

export function LoginError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;
  return <p className="text-sm text-danger">{error}</p>;
}
