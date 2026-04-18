"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import {
  applyCreditSchema,
  attendanceSchema,
  correctInvoiceSchema,
  forgotPasswordSchema,
  freezeSubscriptionSchema,
  gymProfileSchema,
  gymSettingsSchema,
  loginSchema,
  memberProfileSchema,
  membershipPlanSchema,
  membershipSaleSchema,
  onboardingSchema,
  recordPaymentSchema,
  reminderTemplateSchema,
  renewSubscriptionSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/schemas/forms";
import {
  applyMembershipCreditRpc,
  completeOnboardingRpc,
  correctInvoiceRpc,
  createMembershipSaleRpc,
  freezeSubscriptionRpc,
  recordPaymentAndAllocateRpc,
  renewSubscriptionRpc,
} from "@/lib/rpc/repcore";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { normalizeSupabaseErrorMessage } from "@/lib/supabase/errors";
import { toPaise } from "@/lib/utils/format";
import { logAdminAction } from "@/lib/utils/admin-log";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function assertSupabaseSuccess(error: { message: string } | null) {
  if (error) {
    throw new Error(normalizeSupabaseErrorMessage(error.message));
  }
}

async function requireGymContext() {
  const session = await getSessionContext();
  if (!session.user || !session.gym || !session.gymUser) {
    redirect("/login");
  }
  return session;
}

async function requireOwnerContext() {
  const session = await requireGymContext();
  if (session.gymUser?.role !== "owner") {
    redirect("/dashboard");
  }
  return session;
}

export async function loginAction(formData: FormData) {
  const values = loginSchema.parse({
    email: asString(formData.get("email")),
    password: asString(formData.get("password")),
  });

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(normalizeSupabaseErrorMessage(error.message))}`);
  }

  logAdminAction("login", { email: values.email });

  const session = await getSessionContext();
  if (session.gym) {
    redirect("/dashboard");
  }

  redirect("/setup");
}

export async function signupAction(formData: FormData) {
  const values = signupSchema.parse({
    fullName: asString(formData.get("fullName")),
    email: asString(formData.get("email")),
    password: asString(formData.get("password")),
  });

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        full_name: values.fullName,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(normalizeSupabaseErrorMessage(error.message))}`);
  }

  logAdminAction("signup", { email: values.email, fullName: values.fullName });

  revalidatePath("/setup");
  redirect("/setup");
}

export async function forgotPasswordAction(formData: FormData) {
  try {
    const values = forgotPasswordSchema.parse({
      email: asString(formData.get("email")),
    });

    const supabase = createSupabaseServerClient();
    const { siteUrl } = getSupabaseEnv();
    
    // Use the auth confirmation route to handle PKCE/Token exchange correctly
    const redirectTo = `${siteUrl}/auth/confirm?next=/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });

    if (error) {
      throw error;
    }

    redirect("/forgot-password?success=Check+your+email+for+a+reset+link");
  } catch (error: any) {
    if (error.digest?.includes("NEXT_REDIRECT")) throw error;
    
    const message = error.message || "An unexpected error occurred";
    redirect(`/forgot-password?error=${encodeURIComponent(normalizeSupabaseErrorMessage(message))}`);
  }
}

export async function updatePasswordAction(formData: FormData) {
  try {
    const values = resetPasswordSchema.parse({
      password: asString(formData.get("password")),
      confirmPassword: asString(formData.get("confirmPassword")),
    });

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      throw error;
    }

    // After password reset, Supabase usually logs the user in.
    redirect("/dashboard?success=Password+updated+successfully");
  } catch (error: any) {
    if (error.digest?.includes("NEXT_REDIRECT")) throw error;

    const message = error.message || "An unexpected error occurred";
    redirect(`/reset-password?error=${encodeURIComponent(normalizeSupabaseErrorMessage(message))}`);
  }
}

export async function completeOnboardingAction(formData: FormData) {
  const session = await getSessionContext();
  if (!session.user) redirect("/login");

  const values = onboardingSchema.parse({
    orgName: asString(formData.get("orgName")),
    gymName: asString(formData.get("gymName")),
    gymPhone: asString(formData.get("gymPhone")),
    gymAddress: asString(formData.get("gymAddress")),
    timezone: asString(formData.get("timezone")) || "Asia/Kolkata",
    firstPlanName: asString(formData.get("firstPlanName")),
    firstPlanDurationDays: asString(formData.get("firstPlanDurationDays")),
    firstPlanPriceRupees: asString(formData.get("firstPlanPriceRupees")),
    renewalMode: asString(formData.get("renewalMode")) || "continue_from_last_end",
    gstEnabled: asBoolean(formData.get("gstEnabled")),
  });

  const supabase = createSupabaseServerClient();
  const { error } = await completeOnboardingRpc(supabase, {
    orgName: values.orgName,
    gymName: values.gymName,
    gymPhone: values.gymPhone,
    gymAddress: values.gymAddress,
    timezone: values.timezone,
    firstPlanName: values.firstPlanName,
    firstPlanDurationDays: values.firstPlanDurationDays,
    firstPlanPricePaise: toPaise(values.firstPlanPriceRupees),
    renewalMode: values.renewalMode,
    gstEnabled: values.gstEnabled,
  });

  if (error) {
    redirect(`/setup?error=${encodeURIComponent(normalizeSupabaseErrorMessage(error.message))}`);
  }

  logAdminAction("onboarding", { 
    email: session.user.email, 
    gymName: values.gymName, 
    phone: values.gymPhone 
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function upsertMembershipPlanAction(formData: FormData) {
  const session = await requireOwnerContext();
  const supabase = createSupabaseServerClient();
  const values = membershipPlanSchema.parse({
    id: asString(formData.get("id")) || undefined,
    name: asString(formData.get("name")),
    durationDays: asString(formData.get("durationDays")),
    priceRupees: asString(formData.get("priceRupees")),
    isActive: asBoolean(formData.get("isActive")),
  });

  const payload = {
    gym_id: session.gym!.id,
    name: values.name,
    duration_days: values.durationDays,
    price_paise: toPaise(values.priceRupees),
    is_active: values.isActive ?? true,
  };

  const { error } = values.id
    ? await supabase.from("membership_plans").update(payload).eq("id", values.id).eq("gym_id", session.gym!.id)
    : await supabase.from("membership_plans").insert(payload);

  assertSupabaseSuccess(error);
  revalidatePath("/plans");
  revalidatePath("/settings");
  redirect("/plans?success=Plan+saved+successfully");
}

export async function updateMemberProfileAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const values = memberProfileSchema.parse({
    memberId: asString(formData.get("memberId")) || undefined,
    fullName: asString(formData.get("fullName")),
    phone: asString(formData.get("phone")),
    photoUrl: asString(formData.get("photoUrl")),
    notes: asString(formData.get("notes")),
  });

  if (!values.memberId) return;

  const { error } = await supabase
    .from("members")
    .update({
      full_name: values.fullName,
      phone: values.phone,
      photo_url: values.photoUrl || null,
      notes: values.notes || null,
    })
    .eq("id", values.memberId)
    .eq("gym_id", session.gym!.id);

  assertSupabaseSuccess(error);
  revalidatePath("/members");
  revalidatePath(`/members/${values.memberId}`);
  redirect(`/members/${values.memberId}?success=Profile+updated`);
}

export async function archiveMembershipAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const membershipId = asString(formData.get("membershipId"));
  const archiveReason = asString(formData.get("archiveReason"));

  const { error } = await supabase
    .from("memberships")
    .update({
      archived_at: new Date().toISOString(),
      archive_reason: archiveReason || "Archived from RepCore",
    })
    .eq("id", membershipId)
    .eq("gym_id", session.gym!.id);

  assertSupabaseSuccess(error);
  revalidatePath("/members");
  redirect("/members?success=Member+archived");
}

export async function createMembershipSaleAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const values = membershipSaleSchema.parse({
    existingMemberId: asString(formData.get("existingMemberId")) || undefined,
    fullName: asString(formData.get("fullName")),
    phone: asString(formData.get("phone")),
    photoUrl: asString(formData.get("photoUrl")),
    notes: asString(formData.get("notes")),
    planId: asString(formData.get("planId")),
    startDate: asString(formData.get("startDate")),
    saleReason: asString(formData.get("saleReason")) || "new_join",
    paidAmountRupees: asString(formData.get("paidAmountRupees")),
    paymentMethod: asString(formData.get("paymentMethod")),
    paymentReference: asString(formData.get("paymentReference")),
  });
  const biometricDeviceId = asString(formData.get("biometricDeviceId")) || null;

  const { data: rpcData, error } = await createMembershipSaleRpc(supabase, {
    gymId: session.gym!.id,
    existingMemberId: values.existingMemberId,
    fullName: values.fullName,
    phone: values.phone,
    photoUrl: values.photoUrl,
    notes: values.notes,
    planId: values.planId,
    startDate: values.startDate,
    saleReason: values.saleReason,
  });

  assertSupabaseSuccess(error);

  // Set biometric device ID on the member row if provided
  if (biometricDeviceId && rpcData?.member_id) {
    await supabase
      .from("members")
      .update({ biometric_device_id: biometricDeviceId })
      .eq("gym_id", session.gym!.id)
      .eq("id", rpcData.member_id);
  }

  if (values.paidAmountRupees > 0 && rpcData?.invoice_id && rpcData?.membership_id) {
    const { error: paymentError } = await recordPaymentAndAllocateRpc(supabase, {
      gymId: session.gym!.id,
      membershipId: rpcData.membership_id,
      amountPaise: toPaise(values.paidAmountRupees),
      method: values.paymentMethod,
      receivedOn: new Date().toISOString(),
      allocations: [
        {
          invoiceId: rpcData.invoice_id,
          amountPaise: toPaise(values.paidAmountRupees),
        },
      ],
      referenceCode: values.paymentReference || undefined,
      note: "Initial payment during sign up",
    });
    assertSupabaseSuccess(paymentError);
  }

  revalidatePath("/members");
  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect("/members?success=Member+added+successfully");
}

export async function renewSubscriptionAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const values = renewSubscriptionSchema.parse({
    membershipId: asString(formData.get("membershipId")),
    planId: asString(formData.get("planId")),
    startDate: asString(formData.get("startDate")) || undefined,
    notes: asString(formData.get("notes")),
  });

  const { error } = await renewSubscriptionRpc(supabase, {
    gymId: session.gym!.id,
    membershipId: values.membershipId,
    planId: values.planId,
    startDate: values.startDate,
    notes: values.notes,
  });

  assertSupabaseSuccess(error);
  revalidatePath("/members");
  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect(`/members/${values.membershipId}?success=Subscription+renewed`);
}

export async function freezeSubscriptionAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const values = freezeSubscriptionSchema.parse({
    subscriptionId: asString(formData.get("subscriptionId")),
    freezeStartDate: asString(formData.get("freezeStartDate")),
    freezeEndDate: asString(formData.get("freezeEndDate")),
    reason: asString(formData.get("reason")),
  });

  const { error } = await freezeSubscriptionRpc(supabase, {
    gymId: session.gym!.id,
    subscriptionId: values.subscriptionId,
    freezeStartDate: values.freezeStartDate,
    freezeEndDate: values.freezeEndDate,
    reason: values.reason,
  });

  assertSupabaseSuccess(error);
  revalidatePath("/members");
  redirect("/members?success=Subscription+frozen");
}

export async function recordPaymentAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const allocationRaw = asString(formData.get("allocations"));
  const allocationInvoiceId = asString(formData.get("allocationInvoiceId"));
  const allocationAmountRupees = asString(formData.get("allocationAmountRupees"));

  const fallbackAllocations =
    allocationInvoiceId
      ? [{ invoiceId: allocationInvoiceId, amountRupees: allocationAmountRupees || asString(formData.get("amountRupees")) }]
      : [];

  const values = recordPaymentSchema.parse({
    membershipId: asString(formData.get("membershipId")),
    amountRupees: asString(formData.get("amountRupees")),
    method: asString(formData.get("method")),
    receivedOn: asString(formData.get("receivedOn")),
    referenceCode: asString(formData.get("referenceCode")),
    note: asString(formData.get("note")),
    allocations: allocationRaw ? JSON.parse(allocationRaw) : fallbackAllocations,
  });

  const { error } = await recordPaymentAndAllocateRpc(supabase, {
    gymId: session.gym!.id,
    membershipId: values.membershipId,
    amountPaise: toPaise(values.amountRupees),
    method: values.method,
    receivedOn: values.receivedOn,
    referenceCode: values.referenceCode,
    note: values.note,
    allocations: values.allocations.map((item) => ({
      invoiceId: item.invoiceId,
      amountPaise: toPaise(item.amountRupees),
    })),
  });

  assertSupabaseSuccess(error);
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  revalidatePath("/members");
  redirect("/billing?success=Payment+recorded");
}

export async function applyCreditAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const values = applyCreditSchema.parse({
    membershipId: asString(formData.get("membershipId")),
    invoiceId: asString(formData.get("invoiceId")),
    amountRupees: asString(formData.get("amountRupees")),
    note: asString(formData.get("note")),
  });

  const { error } = await applyMembershipCreditRpc(supabase, {
    gymId: session.gym!.id,
    membershipId: values.membershipId,
    invoiceId: values.invoiceId,
    amountPaise: toPaise(values.amountRupees),
    note: values.note,
  });

  assertSupabaseSuccess(error);
  revalidatePath("/billing");
  revalidatePath("/members");
  redirect("/billing?success=Credit+applied");
}

export async function correctInvoiceAction(formData: FormData) {
  const session = await requireOwnerContext();
  const supabase = createSupabaseServerClient();
  const values = correctInvoiceSchema.parse({
    invoiceId: asString(formData.get("invoiceId")),
    replacementAmountRupees: asString(formData.get("replacementAmountRupees")),
    reason: asString(formData.get("reason")),
    notes: asString(formData.get("notes")),
  });

  const { error } = await correctInvoiceRpc(supabase, {
    gymId: session.gym!.id,
    invoiceId: values.invoiceId,
    replacementAmountPaise: toPaise(values.replacementAmountRupees),
    reason: values.reason,
    notes: values.notes,
  });

  assertSupabaseSuccess(error);
  revalidatePath("/billing");
  revalidatePath("/members");
  redirect("/billing?success=Invoice+corrected");
}

export async function markAttendanceAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const values = attendanceSchema.parse({
    membershipId: asString(formData.get("membershipId")),
    checkInDate: asString(formData.get("checkInDate")),
  });

  if (session.settings?.freeze_blocks_checkin) {
    const { data: activeFreeze } = await supabase
      .from("subscription_freezes")
      .select("id, subscriptions!inner(membership_id)")
      .eq("gym_id", session.gym!.id)
      .eq("subscriptions.membership_id", values.membershipId)
      .lte("freeze_start_date", values.checkInDate)
      .gte("freeze_end_date", values.checkInDate)
      .limit(1)
      .maybeSingle();

    if (activeFreeze) {
      redirect(
        `/attendance?date=${encodeURIComponent(values.checkInDate)}&error=${encodeURIComponent("This membership is frozen for the selected date.")}`,
      );
    }
  }

  const { error } = await supabase.from("attendance_logs").upsert(
    {
      gym_id: session.gym!.id,
      membership_id: values.membershipId,
      check_in_date: values.checkInDate,
      checked_in_at: new Date().toISOString(),
      source: "manual",
      recorded_by: session.user!.id,
    },
    {
      onConflict: "membership_id,check_in_date",
      ignoreDuplicates: true,
    },
  );

  assertSupabaseSuccess(error);
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  redirect(`/attendance?date=${encodeURIComponent(values.checkInDate)}&success=Check-in+recorded`);
}

export async function updateGymProfileAction(formData: FormData) {
  const session = await requireOwnerContext();
  const supabase = createSupabaseServerClient();
  const values = gymProfileSchema.parse({
    name: asString(formData.get("name")),
    phone: asString(formData.get("phone")),
    address: asString(formData.get("address")),
    logoUrl: asString(formData.get("logoUrl")),
    gstNumber: asString(formData.get("gstNumber")),
  });

  const { error } = await supabase
    .from("gyms")
    .update({
      name: values.name,
      phone: values.phone,
      address: values.address || null,
      logo_url: values.logoUrl || null,
      gst_number: values.gstNumber || null,
    })
    .eq("id", session.gym!.id);

  assertSupabaseSuccess(error);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?success=Profile+saved");
}

export async function updateGymSettingsAction(formData: FormData) {
  const session = await requireOwnerContext();
  const supabase = createSupabaseServerClient();
  const values = gymSettingsSchema.parse({
    expiringWarningDays: asString(formData.get("expiringWarningDays")),
    renewalMode: asString(formData.get("renewalMode")) || "continue_from_last_end",
    freezeBlocksCheckin: asBoolean(formData.get("freezeBlocksCheckin")),
    gstEnabled: asBoolean(formData.get("gstEnabled")),
  });

  const { error } = await supabase
    .from("gym_settings")
    .update({
      expiring_warning_days: values.expiringWarningDays,
      renewal_mode: values.renewalMode,
      freeze_blocks_checkin: values.freezeBlocksCheckin,
      gst_enabled: values.gstEnabled,
    })
    .eq("gym_id", session.gym!.id);

  assertSupabaseSuccess(error);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?success=Settings+saved");
}

export async function updateReminderTemplateAction(formData: FormData) {
  const session = await requireOwnerContext();
  const supabase = createSupabaseServerClient();
  const values = reminderTemplateSchema.parse({
    templateType: asString(formData.get("templateType")),
    body: asString(formData.get("body")),
  });

  const { error } = await supabase.from("reminder_templates").upsert(
    {
      gym_id: session.gym!.id,
      template_type: values.templateType,
      body: values.body,
      is_active: true,
    },
    { onConflict: "gym_id,template_type" },
  );

  assertSupabaseSuccess(error);
  revalidatePath("/settings");
  revalidatePath("/reminders");
  redirect("/settings?success=Template+saved");
}

export async function logManualReminderAction(payload: {
  membershipId: string;
  subscriptionId?: string;
  invoiceId?: string;
  templateId?: string;
  recipientPhone: string;
  renderedBody: string;
  whatsappUrl: string;
}) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("message_logs").insert({
    gym_id: session.gym!.id,
    membership_id: payload.membershipId,
    subscription_id: payload.subscriptionId ?? null,
    invoice_id: payload.invoiceId ?? null,
    template_id: payload.templateId ?? null,
    channel: "whatsapp_manual",
    status: "opened",
    recipient_phone: payload.recipientPhone,
    rendered_body: payload.renderedBody,
    whatsapp_url: payload.whatsappUrl,
    triggered_by: session.user!.id,
    sent_at: new Date().toISOString(),
  });

  assertSupabaseSuccess(error);
  revalidatePath("/reminders");
  revalidatePath("/members");
}

export async function markReminderPaidAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const membershipId = asString(formData.get("membershipId"));
  const subscriptionId = asString(formData.get("subscriptionId"));

  if (!membershipId) return;

  const { data: openInvoices } = await supabase
    .from("v_invoice_balances")
    .select("invoice_id, amount_due_paise")
    .eq("gym_id", session.gym!.id)
    .eq("membership_id", membershipId)
    .gt("amount_due_paise", 0)
    .neq("derived_status", "voided");

  const totalDuePaise = (openInvoices || []).reduce((sum, inv) => sum + inv.amount_due_paise, 0);

  if (totalDuePaise > 0) {
    const { error } = await recordPaymentAndAllocateRpc(supabase, {
      gymId: session.gym!.id,
      membershipId,
      amountPaise: totalDuePaise,
      method: "cash",
      receivedOn: new Date().toISOString(),
      allocations: (openInvoices || []).map((inv) => ({
        invoiceId: inv.invoice_id,
        amountPaise: inv.amount_due_paise,
      })),
      note: "Marked as already paid from reminders",
    });

    assertSupabaseSuccess(error);
  }

  // Clear reminder columns on the subscription
  if (subscriptionId) {
    await supabase
      .from("subscriptions")
      .update({
        reminder_5_sent_at: null,
        reminder_3_sent_at: null,
        reminder_1_sent_at: null,
      })
      .eq("id", subscriptionId)
      .eq("gym_id", session.gym!.id);
  }

  // Clear lapse status on membership
  await supabase
    .from("memberships")
    .update({ lapsed_at: null })
    .eq("id", membershipId)
    .eq("gym_id", session.gym!.id);

  revalidatePath("/reminders");
  revalidatePath("/members");
  revalidatePath("/billing");
}

export async function markReminderSentAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const subscriptionId = asString(formData.get("subscriptionId"));
  const stage = asString(formData.get("stage")); // "5", "3", or "1"

  if (!subscriptionId || !["5", "3", "1"].includes(stage)) return;

  const columnMap: Record<string, string> = {
    "5": "reminder_5_sent_at",
    "3": "reminder_3_sent_at",
    "1": "reminder_1_sent_at",
  };

  const { error } = await supabase
    .from("subscriptions")
    .update({ [columnMap[stage]]: new Date().toISOString() })
    .eq("id", subscriptionId)
    .eq("gym_id", session.gym!.id);

  assertSupabaseSuccess(error);
  revalidatePath("/reminders");
}

export async function reactivateLapsedMemberAction(formData: FormData) {
  const session = await requireGymContext();
  const supabase = createSupabaseServerClient();
  const membershipId = asString(formData.get("membershipId"));
  const memberId = asString(formData.get("memberId"));

  if (!membershipId) return;

  const { error } = await supabase
    .from("memberships")
    .update({ lapsed_at: null })
    .eq("id", membershipId)
    .eq("gym_id", session.gym!.id);

  assertSupabaseSuccess(error);
  revalidatePath("/reminders");
  revalidatePath("/members");

  if (memberId) {
    redirect(`/members/${memberId}`);
  }
}

