export function normalizeSupabaseErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("invalid api key") || lower.includes("invalid apikey")) {
    return "Supabase credentials are invalid. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local with values from the same Supabase project, then restart the app.";
  }

  if (lower.includes("missing supabase environment variables")) {
    return "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env.local.";
  }

  if (lower.includes("failed to fetch") || lower.includes("network request failed")) {
    return "RepCore could not reach Supabase. Check your project URL, internet connection, and whether the Supabase project is active.";
  }

  return message;
}
