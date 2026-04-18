import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    
    // In case of error, redirect to login with the error message
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }

  // Fallback if params missing
  return NextResponse.redirect(new URL("/login?error=Invalid+verification+link", request.url));
}
