import type { SupabaseClient } from "@supabase/supabase-js";

type RpcClient = SupabaseClient;

export async function completeOnboardingRpc(
  supabase: RpcClient,
  payload: {
    orgName: string;
    gymName: string;
    gymPhone: string;
    gymAddress?: string;
    timezone: string;
    firstPlanName: string;
    firstPlanDurationDays: number;
    firstPlanPricePaise: number;
    renewalMode: "continue_from_last_end" | "restart_from_today";
    gstEnabled: boolean;
  },
) {
  return supabase.rpc("complete_onboarding", {
    p_org_name: payload.orgName,
    p_gym_name: payload.gymName,
    p_phone: payload.gymPhone,
    p_address: payload.gymAddress || null,
    p_timezone: payload.timezone,
    p_first_plan_name: payload.firstPlanName,
    p_first_plan_duration_days: payload.firstPlanDurationDays,
    p_first_plan_price_paise: payload.firstPlanPricePaise,
    p_renewal_mode: payload.renewalMode,
    p_gst_enabled: payload.gstEnabled,
  });
}

export async function createMembershipSaleRpc(
  supabase: RpcClient,
  payload: {
    gymId: string;
    existingMemberId?: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
    gender?: string;
    notes?: string;
    planId: string;
    startDate: string;
    saleReason: "new_join" | "rejoin";
  },
) {
  return supabase.rpc("create_membership_sale", {
    p_gym_id: payload.gymId,
    p_member_id: payload.existingMemberId ?? null,
    p_member_name: payload.fullName,
    p_phone: payload.phone,
    p_photo_url: payload.photoUrl || null,
    p_gender: payload.gender || null,
    p_notes: payload.notes || null,
    p_plan_id: payload.planId,
    p_start_date: payload.startDate,
    p_invoice_reason: payload.saleReason,
  });
}

export async function renewSubscriptionRpc(
  supabase: RpcClient,
  payload: {
    gymId: string;
    membershipId: string;
    planId: string;
    startDate?: string;
    notes?: string;
  },
) {
  return supabase.rpc("renew_subscription", {
    p_gym_id: payload.gymId,
    p_membership_id: payload.membershipId,
    p_plan_id: payload.planId,
    p_start_date: payload.startDate || null,
    p_notes: payload.notes || null,
  });
}

export async function freezeSubscriptionRpc(
  supabase: RpcClient,
  payload: {
    gymId: string;
    subscriptionId: string;
    freezeStartDate: string;
    freezeEndDate: string;
    reason?: string;
  },
) {
  return supabase.rpc("freeze_subscription", {
    p_gym_id: payload.gymId,
    p_subscription_id: payload.subscriptionId,
    p_freeze_start_date: payload.freezeStartDate,
    p_freeze_end_date: payload.freezeEndDate,
    p_reason: payload.reason || null,
  });
}

export async function recordPaymentAndAllocateRpc(
  supabase: RpcClient,
  payload: {
    gymId: string;
    membershipId: string;
    amountPaise: number;
    method: "cash" | "upi" | "bank_transfer" | "card" | "other";
    receivedOn: string;
    referenceCode?: string;
    note?: string;
    allocations: Array<{ invoiceId: string; amountPaise: number }>;
  },
) {
  return supabase.rpc("record_payment_and_allocate", {
    p_gym_id: payload.gymId,
    p_membership_id: payload.membershipId,
    p_amount_paise: payload.amountPaise,
    p_method: payload.method,
    p_received_on: payload.receivedOn,
    p_reference_code: payload.referenceCode || null,
    p_note: payload.note || null,
    p_allocations: payload.allocations.map((item) => ({
      invoice_id: item.invoiceId,
      amount_paise: item.amountPaise,
    })),
  });
}

export async function applyMembershipCreditRpc(
  supabase: RpcClient,
  payload: {
    gymId: string;
    membershipId: string;
    invoiceId: string;
    amountPaise: number;
    note?: string;
  },
) {
  return supabase.rpc("apply_membership_credit", {
    p_gym_id: payload.gymId,
    p_membership_id: payload.membershipId,
    p_invoice_id: payload.invoiceId,
    p_amount_paise: payload.amountPaise,
    p_note: payload.note || null,
  });
}

export async function correctInvoiceRpc(
  supabase: RpcClient,
  payload: {
    gymId: string;
    invoiceId: string;
    replacementAmountPaise: number;
    reason: string;
    notes?: string;
  },
) {
  return supabase.rpc("correct_invoice", {
    p_gym_id: payload.gymId,
    p_original_invoice_id: payload.invoiceId,
    p_replacement_total_paise: payload.replacementAmountPaise,
    p_reason: payload.reason,
    p_notes: payload.notes || null,
  });
}
