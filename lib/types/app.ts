import type { User } from "@supabase/supabase-js";
import type { Entitlements } from "@/lib/constants/entitlements";

export type AppRole = "owner" | "front_desk";
export type GymTier = "basic" | "growth";

export type SessionContext = {
  user: User | null;
  gymUser: {
    gym_id: string;
    role: AppRole;
  } | null;
  gym: {
    id: string;
    organization_id: string;
    name: string;
    phone: string;
    address: string | null;
    logo_url: string | null;
    gst_number: string | null;
    timezone: string;
  } | null;
  settings: {
    gym_id: string;
    expiring_warning_days: number;
    renewal_mode: "continue_from_last_end" | "restart_from_today";
    freeze_blocks_checkin: boolean;
    gst_enabled: boolean;
    receipt_prefix: string;
    invoice_prefix: string;
  } | null;
  gymSubscription: {
    id: string;
    tier: GymTier;
    status: string;
    current_period_end: string | null;
  } | null;
  entitlements: Entitlements;
};
