import { cache } from "react";
import { getEntitlements } from "@/lib/constants/entitlements";
import type { SessionContext } from "@/lib/types/app";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      gymUser: null,
      gym: null,
      settings: null,
      gymSubscription: null,
      entitlements: getEntitlements(null),
    };
  }

  const { data: gymUser } = await supabase
    .from("gym_users")
    .select("gym_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!gymUser) {
    return {
      user,
      gymUser: null,
      gym: null,
      settings: null,
      gymSubscription: null,
      entitlements: getEntitlements(null),
    };
  }

  const [gymResponse, settingsResponse, subscriptionResponse] = await Promise.all([
    supabase
      .from("gyms")
      .select("id, organization_id, name, phone, address, logo_url, gst_number, timezone")
      .eq("id", gymUser.gym_id)
      .maybeSingle(),
    supabase
      .from("gym_settings")
      .select("gym_id, expiring_warning_days, renewal_mode, freeze_blocks_checkin, gst_enabled, receipt_prefix, invoice_prefix")
      .eq("gym_id", gymUser.gym_id)
      .maybeSingle(),
    supabase
      .from("gym_subscriptions")
      .select("id, tier, status, current_period_end")
      .eq("gym_id", gymUser.gym_id)
      .maybeSingle(),
  ]);

  const gymSubscription = subscriptionResponse.data
    ? {
        id: subscriptionResponse.data.id as string,
        tier: (subscriptionResponse.data.tier as "basic" | "growth") ?? "basic",
        status: subscriptionResponse.data.status as string,
        current_period_end: subscriptionResponse.data.current_period_end as string | null,
      }
    : null;

  return {
    user,
    gymUser: {
      gym_id: gymUser.gym_id as string,
      role: gymUser.role as "owner" | "front_desk",
    },
    gym: (gymResponse.data as SessionContext["gym"]) ?? null,
    settings: (settingsResponse.data as SessionContext["settings"]) ?? null,
    gymSubscription,
    entitlements: getEntitlements(gymSubscription?.tier),
  };
});
