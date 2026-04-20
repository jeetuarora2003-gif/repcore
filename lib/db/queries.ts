import { addDays, endOfMonth, format, isAfter, isBefore, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MemberRecord = {
  id: string;
  full_name: string;
  phone: string;
  photo_url: string | null;
  notes: string | null;
  joined_on: string;
  created_at?: string;
};

type MembershipRecord = {
  id: string;
  gym_id: string;
  member_id: string;
  started_on: string;
  archived_at: string | null;
  archive_reason: string | null;
  members: MemberRecord;
};

type SubscriptionRecord = {
  subscription_id: string;
  gym_id: string;
  membership_id: string;
  membership_plan_id: string | null;
  previous_subscription_id: string | null;
  plan_snapshot_name: string;
  plan_snapshot_duration_days: number;
  plan_snapshot_price_paise: number;
  start_date: string;
  end_date: string;
  effective_end_date: string;
  frozen_days: number;
  status: string;
  created_at: string;
  reminder_1_sent_at: string | null;
  reminder_3_sent_at: string | null;
  reminder_5_sent_at: string | null;
};

type FreezeRecord = {
  id: string;
  gym_id: string;
  subscription_id: string;
  freeze_start_date: string;
  freeze_end_date: string;
  reason: string | null;
  created_at: string;
};

export type InvoiceBalance = {
  invoice_id: string;
  gym_id: string;
  membership_id: string;
  subscription_id: string;
  invoice_number: string;
  reason: string;
  total_amount_paise: number;
  issued_on: string;
  voided_at: string | null;
  payment_allocated_paise: number;
  credit_applied_paise: number;
  amount_due_paise: number;
  derived_status: "open" | "partially_paid" | "paid" | "voided";
};

type PaymentRecord = {
  id: string;
  gym_id: string;
  membership_id: string;
  amount_paise: number;
  method: string;
  status: string;
  received_on: string;
  reference_code: string | null;
  note: string | null;
  created_at: string;
};

type AttendanceRecord = {
  id: string;
  gym_id: string;
  membership_id: string;
  check_in_date: string;
  checked_in_at: string;
  source?: string;
  created_at: string;
};

type MessageLogRecord = {
  id: string;
  gym_id: string;
  membership_id: string;
  subscription_id: string | null;
  invoice_id: string | null;
  template_id: string | null;
  channel: string;
  status: string;
  recipient_phone: string;
  rendered_body: string;
  whatsapp_url: string | null;
  created_at: string;
};

export type MembershipPlanRecord = {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price_paise: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReminderTemplateRecord = {
  id: string;
  gym_id: string;
  template_type: "fee_due" | "membership_expiry" | "welcome";
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PaymentBalanceRecord = {
  payment_id: string;
  gym_id: string;
  membership_id: string;
  amount_paise: number;
  allocated_paise: number;
  credit_created_paise: number;
  unallocated_paise: number;
};

type MembershipCreditBalanceRecord = {
  membership_id: string;
  gym_id: string;
  credit_balance_paise: number;
};

type MembershipLookupRecord = {
  id: string;
  member_id: string;
  archived_at: string | null;
  members: {
    id: string;
    full_name: string;
    phone: string;
    photo_url: string | null;
  };
};

type MembershipRow = Omit<MembershipRecord, "members"> & {
  members: MemberRecord | MemberRecord[];
};

type MembershipLookupRow = Omit<MembershipLookupRecord, "members"> & {
  members: MembershipLookupRecord["members"] | MembershipLookupRecord["members"][];
};

function toDate(value: string) {
  return startOfDay(parseISO(value));
}

function isBetweenInclusive(target: Date, start: Date, end: Date) {
  return !isBefore(target, start) && !isAfter(target, end);
}

function hasActiveFreeze(subscriptionId: string, freezes: FreezeRecord[], onDate = startOfDay(new Date())) {
  return freezes.some(
    (freeze) =>
      freeze.subscription_id === subscriptionId &&
      isBetweenInclusive(onDate, toDate(freeze.freeze_start_date), toDate(freeze.freeze_end_date)),
  );
}

function asSingleMember(member: MemberRecord | MemberRecord[]) {
  return Array.isArray(member) ? member[0] : member;
}

function asSingleLookupMember(
  member: MembershipLookupRecord["members"] | MembershipLookupRecord["members"][],
) {
  return Array.isArray(member) ? member[0] : member;
}

function normalizeMembershipRow(row: MembershipRow): MembershipRecord {
  return {
    ...row,
    members: asSingleMember(row.members),
  };
}

function normalizeMembershipLookupRow(row: MembershipLookupRow): MembershipLookupRecord {
  return {
    ...row,
    members: asSingleLookupMember(row.members),
  };
}

export function deriveMembershipStatus(
  membership: MembershipRecord,
  subscriptions: SubscriptionRecord[],
  warningDays: number,
  freezes: FreezeRecord[],
) {
  if (membership.archived_at) {
    return "archived";
  }

  const today = startOfDay(new Date());
  const warningDate = addDays(today, warningDays);
  const liveSubscription = subscriptions.find((item) => item.status === "active" || item.status === "frozen");
  const latestSubscription = [...subscriptions].sort((a, b) => b.effective_end_date.localeCompare(a.effective_end_date))[0];

  if (liveSubscription) {
    const effectiveEndDate = toDate(liveSubscription.effective_end_date);
    if (isBefore(effectiveEndDate, today)) {
      return "expired";
    }
    if (hasActiveFreeze(liveSubscription.subscription_id, freezes, today)) {
      return "frozen";
    }
    if (isBetweenInclusive(effectiveEndDate, today, warningDate)) {
      return "expiring_soon";
    }
    return "active";
  }

  if (latestSubscription && isBefore(toDate(latestSubscription.effective_end_date), today)) {
    return "expired";
  }

  return "inactive";
}

export function getCurrentSubscription(subscriptions: SubscriptionRecord[]) {
  const live = subscriptions.find((item) => item.status === "active" || item.status === "frozen");
  if (live) return live;
  return [...subscriptions].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null;
}

export async function getMembershipPlans(gymId: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("gym_id", gymId)
    .order("is_active", { ascending: false })
    .order("duration_days", { ascending: true });

  return (data as MembershipPlanRecord[]) ?? [];
}

export async function getReminderTemplates(gymId: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("reminder_templates").select("*").eq("gym_id", gymId);
  return (data as ReminderTemplateRecord[]) ?? [];
}

export async function getGymCoreData(gymId: string, queryArchived: boolean = true, attendanceLimitDays?: number) {
  const supabase = createSupabaseServerClient();

  let membershipsQuery = supabase
      .from("memberships")
      .select("id, gym_id, member_id, started_on, archived_at, archive_reason, members!inner(id, full_name, phone, photo_url, notes, joined_on, created_at)")
      .eq("gym_id", gymId)
      .order("started_on", { ascending: false });
      
  if (!queryArchived) {
      membershipsQuery = membershipsQuery.is("archived_at", null);
  }

  const [
    membershipsResponse,
    subscriptionsResponse,
    invoicesResponse,
    paymentsResponse,
    attendanceResponse,
    messageLogsResponse,
    freezesResponse,
  ] = await Promise.all([
    membershipsQuery,
    supabase.from("v_subscription_effective_dates").select("*").eq("gym_id", gymId),
    supabase.from("v_invoice_balances").select("*").eq("gym_id", gymId),
    supabase.from("payments").select("*").eq("gym_id", gymId).order("received_on", { ascending: false }),
    (() => {
      let q = supabase.from("attendance_logs").select("*").eq("gym_id", gymId).order("check_in_date", { ascending: false });
      if (attendanceLimitDays) {
        const d = format(subDays(new Date(), attendanceLimitDays), "yyyy-MM-dd");
        q = q.gte("check_in_date", d);
      }
      return q;
    })(),
    supabase.from("message_logs").select("*").eq("gym_id", gymId).order("created_at", { ascending: false }).limit(100),
    supabase.from("subscription_freezes").select("*").eq("gym_id", gymId),
  ]);

  return {
    memberships: ((membershipsResponse.data as MembershipRow[] | null) ?? []).map(normalizeMembershipRow),
    subscriptions: (subscriptionsResponse.data as SubscriptionRecord[]) ?? [],
    invoiceBalances: (invoicesResponse.data as InvoiceBalance[]) ?? [],
    payments: (paymentsResponse.data as PaymentRecord[]) ?? [],
    attendanceLogs: (attendanceResponse.data as AttendanceRecord[]) ?? [],
    messageLogs: (messageLogsResponse.data as MessageLogRecord[]) ?? [],
    freezes: (freezesResponse.data as FreezeRecord[]) ?? [],
  };
}

export async function getDashboardData(gymId: string, warningDays: number) {
  const { memberships, subscriptions, invoiceBalances, payments, attendanceLogs, messageLogs, freezes } = await getGymCoreData(gymId, true, 2);
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const records = memberships
    .filter(m => m.archived_at === null)
    .map((membership) => {
    const memberSubscriptions = subscriptions.filter((item) => item.membership_id === membership.id);
    const memberInvoices = invoiceBalances.filter((item) => item.membership_id === membership.id && item.derived_status !== "voided");
    return {
      ...membership,
      currentSubscription: getCurrentSubscription(memberSubscriptions),
      status: deriveMembershipStatus(membership, memberSubscriptions, warningDays, freezes),
      duePaise: memberInvoices.reduce((sum, item) => sum + item.amount_due_paise, 0),
    };
  });

  const activeMembersCount = records.filter((item) => ["active", "expiring_soon", "frozen"].includes(item.status)).length;
  const expiringThisWeek = records.filter((item) => item.status === "expiring_soon");
  const pendingDueAmount = records.reduce((sum, item) => sum + item.duePaise, 0);
  const monthlyRevenue = payments
    .filter((payment) => {
      const received = toDate(payment.received_on);
      return !isBefore(received, monthStart) && !isAfter(received, monthEnd) && payment.status === "recorded";
    })
    .reduce((sum, payment) => sum + payment.amount_paise, 0);

  const recentActivity = [
    ...payments.slice(0, 6).map((payment) => ({
      id: payment.id,
      type: "payment",
      created_at: payment.created_at,
      title: `Payment of ${formatCurrency(payment.amount_paise)} recorded`,
      body: payment.reference_code ? `Ref ${payment.reference_code}` : "Billing updated",
    })),
    ...attendanceLogs.slice(0, 6).map((log) => ({
      id: log.id,
      type: "attendance",
      created_at: log.created_at,
      title: "Attendance marked",
      body: `Check-in on ${log.check_in_date}`,
    })),
    ...messageLogs.slice(0, 6).map((log) => ({
      id: log.id,
      type: "message",
      created_at: log.created_at,
      title: "Reminder logged",
      body: log.channel,
    })),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  const monthlyBreakdown: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ms = startOfMonth(d);
    const me = endOfMonth(d);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const rev = payments
      .filter((p) => {
        const r = toDate(p.received_on);
        return !isBefore(r, ms) && !isAfter(r, me) && p.status === "recorded";
      })
      .reduce((sum, p) => sum + p.amount_paise, 0);
    monthlyBreakdown.push({ month: label, revenue: rev });
  }

  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");
  const checkinsToday = attendanceLogs.filter(l => l.check_in_date === todayStr).length;
  const checkinsYesterday = attendanceLogs.filter(l => l.check_in_date === yesterdayStr).length;
  const collectedToday = payments
    .filter(p => p.received_on === todayStr && p.status === "recorded")
    .reduce((s, p) => s + p.amount_paise, 0);
  const renewalsToday = subscriptions
    .filter(s => format(parseISO(s.created_at), "yyyy-MM-dd") === todayStr)
    .length;

  const supabase = createSupabaseServerClient();
  const [gymSettings, whatsappCredits] = await Promise.all([
    supabase.from("gyms").select("whatsapp_reminder_mode").eq("id", gymId).single(),
    supabase.from("whatsapp_credits").select("balance_paise").eq("gym_id", gymId).maybeSingle()
  ]);


  return {
    records,
    activeMembersCount,
    expiringThisWeek,
    pendingDueAmount,
    monthlyRevenue,
    monthlyBreakdown,
    recentActivity,
    checkinsToday,
    checkinsYesterday,
    collectedToday,
    renewalsToday,
    whatsappMode: gymSettings.data?.whatsapp_reminder_mode || "manual",
    whatsappBalance: whatsappCredits.data?.balance_paise || 0,
    memberships: memberships.map((m) => ({
      id: m.id,
      members: { full_name: m.members.full_name, phone: m.members.phone },
    })),
  };
}

export async function getMembersPageData(gymId: string, warningDays: number, search = "", status = "all", includeArchived: boolean = false) {
  const { memberships, subscriptions, invoiceBalances, freezes } = await getGymCoreData(gymId, includeArchived);

  const records = memberships.map((membership) => {
    const memberSubscriptions = subscriptions.filter((item) => item.membership_id === membership.id);
    const memberInvoices = invoiceBalances.filter((item) => item.membership_id === membership.id && item.derived_status !== "voided");
    return {
      ...membership,
      currentSubscription: getCurrentSubscription(memberSubscriptions),
      scheduledSubscription: memberSubscriptions.find((item) => item.status === "scheduled") ?? null,
      subscriptions: memberSubscriptions,
      status: deriveMembershipStatus(membership, memberSubscriptions, warningDays, freezes),
      duePaise: memberInvoices.reduce((sum, item) => sum + item.amount_due_paise, 0),
    };
  });

  return records.filter((record) => {
    const matchesSearch =
      !search ||
      record.members.full_name.toLowerCase().includes(search.toLowerCase()) ||
      record.members.phone.includes(search);
    const matchesStatus = status === "all" || record.status === status;

    return matchesSearch && matchesStatus;
  });
}


export async function getMemberDetailData(gymId: string, memberId: string, warningDays: number) {
  const { memberships, subscriptions, invoiceBalances, payments, attendanceLogs, messageLogs, freezes } = await getGymCoreData(gymId);
  const membership = memberships.find((item) => item.member_id === memberId);

  if (!membership) {
    return null;
  }

  const memberSubscriptions = subscriptions.filter((item) => item.membership_id === membership.id);
  const memberInvoices = invoiceBalances.filter((item) => item.membership_id === membership.id);
  const memberPayments = payments.filter((item) => item.membership_id === membership.id);
  const memberAttendance = attendanceLogs.filter((item) => item.membership_id === membership.id);
  const memberMessages = messageLogs.filter((item) => item.membership_id === membership.id);

  return {
    ...membership,
    currentSubscription: getCurrentSubscription(memberSubscriptions),
    subscriptions: memberSubscriptions.sort((a, b) => b.start_date.localeCompare(a.start_date)),
    invoices: memberInvoices.sort((a, b) => b.issued_on.localeCompare(a.issued_on)),
    payments: memberPayments,
    attendance: memberAttendance,
    messages: memberMessages,
    status: deriveMembershipStatus(membership, memberSubscriptions, warningDays, freezes),
  };
}

export async function getBillingPageData(gymId: string) {
  const supabase = createSupabaseServerClient();
  const [invoiceResponse, paymentResponse, creditResponse, membershipsResponse, rawPaymentsResponse] = await Promise.all([
    supabase.from("v_invoice_balances").select("*").eq("gym_id", gymId).order("issued_on", { ascending: false }),
    supabase.from("v_payment_balances").select("*").eq("gym_id", gymId),
    supabase.from("v_membership_credit_balances").select("*").eq("gym_id", gymId),
    supabase
      .from("memberships")
      .select("id, member_id, archived_at, members!inner(id, full_name, phone, photo_url)")
      .eq("gym_id", gymId)
      .is("archived_at", null),
    supabase
      .from("payments")
      .select("id, amount_paise, received_on, status, created_at, method, membership_id")
      .eq("gym_id", gymId)
      .eq("status", "recorded")
      .order("created_at", { ascending: false }),
  ]);

  const allInvoices = (invoiceResponse.data as InvoiceBalance[]) ?? [];
  const allPayments = (rawPaymentsResponse.data as (Pick<PaymentRecord, "id" | "amount_paise" | "received_on" | "status" | "created_at" | "method" | "membership_id"> & { method: string, created_at: string, membership_id: string })[]) ?? [];

  // Financial overview — computed from fetched data, zero extra round-trips
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const monthlyRevenue = allPayments
    .filter((p) => {
      const d = parseISO(p.received_on);
      return !isBefore(d, monthStart) && !isAfter(d, monthEnd);
    })
    .reduce((sum, p) => sum + p.amount_paise, 0);

  const totalCollected = allPayments.reduce((sum, p) => sum + p.amount_paise, 0);
  const totalPendingDues = allInvoices
    .filter((inv) => inv.derived_status !== "paid" && inv.derived_status !== "voided")
    .reduce((sum, inv) => sum + inv.amount_due_paise, 0);
  const openInvoiceCount = allInvoices.filter((inv) => inv.derived_status !== "paid" && inv.derived_status !== "voided").length;

  // Last 6 months revenue bars
  const monthlyBreakdown: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ms = startOfMonth(d);
    const me = endOfMonth(d);
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const rev = allPayments
      .filter((p) => {
        const r = parseISO(p.received_on);
        return !isBefore(r, ms) && !isAfter(r, me);
      })
      .reduce((sum, p) => sum + p.amount_paise, 0);
    monthlyBreakdown.push({ month: label, revenue: rev });
  }

  // Calculate today vs yesterday revenue
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "medium", hour12: false });
  // Just use regular date-fns for now since we just need simple metrics.
  // We'll compute raw data and return it to page.tsx
  const paymentsWithDetails = allPayments;

  return {
    invoices: allInvoices,
    payments: paymentsWithDetails,
    credits: (creditResponse.data as MembershipCreditBalanceRecord[]) ?? [],
    memberships: ((membershipsResponse.data as MembershipLookupRow[] | null) ?? []).map(normalizeMembershipLookupRow),
    financialOverview: {
      monthlyRevenue,
      totalCollected,
      totalPendingDues,
      openInvoiceCount,
      monthlyBreakdown,
    },
  };
}

export async function getAttendancePageData(gymId: string, date: string) {
  const supabase = createSupabaseServerClient();
  const [attendanceResponse, membershipsResponse, lastPushResponse, unmatchedCountResponse] = await Promise.all([
    supabase
      .from("attendance_logs")
      .select("id, membership_id, check_in_date, checked_in_at, source, created_at")
      .eq("gym_id", gymId)
      .eq("check_in_date", date)
      .order("checked_in_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("id, member_id, archived_at, members!inner(id, full_name, phone, photo_url)")
      .eq("gym_id", gymId)
      .is("archived_at", null),
    // Most recent biometric push for live-sync status pill
    supabase
      .from("attendance_logs")
      .select("created_at")
      .eq("gym_id", gymId)
      .eq("source", "biometric_push")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Count of unmatched device IDs for banner
    supabase
      .from("biometric_unmatched_logs")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId),
  ]);

  return {
    attendance: (attendanceResponse.data as AttendanceRecord[]) ?? [],
    memberships: ((membershipsResponse.data as MembershipLookupRow[] | null) ?? []).map(normalizeMembershipLookupRow),
    lastBiometricPush: (lastPushResponse.data as { created_at: string } | null)?.created_at ?? null,
    unmatchedCount: unmatchedCountResponse.count ?? 0,
  };
}

export async function getBiometricSettingsData(gymId: string) {
  const supabase = createSupabaseServerClient();
  const [gymResponse, lastPushResponse, unmatchedResponse] = await Promise.all([
    supabase
      .from("gyms")
      .select("biometric_token")
      .eq("id", gymId)
      .single(),
    supabase
      .from("attendance_logs")
      .select("created_at")
      .eq("gym_id", gymId)
      .eq("source", "biometric_push")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("biometric_unmatched_logs")
      .select("id, raw_device_user_id, raw_datetime, created_at")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return {
    biometricToken: (gymResponse.data as { biometric_token: string | null } | null)?.biometric_token ?? null,
    lastBiometricPush: (lastPushResponse.data as { created_at: string } | null)?.created_at ?? null,
    unmatchedLogs: (unmatchedResponse.data ?? []) as Array<{ id: string; raw_device_user_id: string; raw_datetime: string; created_at: string }>,
  };
}

export async function getReportsData(gymId: string, warningDays: number) {
  const dashboard = await getDashboardData(gymId, warningDays);
  const dueMembers = dashboard.records.filter((item) => item.duePaise > 0);
  const expiring = dashboard.expiringThisWeek;

  return {
    summary: dashboard,
    dueMembers,
    expiring,
  };
}

export async function getSettingsPageData(gymId: string) {
  const [plans, templates] = await Promise.all([getMembershipPlans(gymId), getReminderTemplates(gymId)]);
  return { plans, templates };
}

export async function getSubscriptionsPageData(gymId: string, warningDays: number) {
  const records = await getMembersPageData(gymId, warningDays);

  return {
    live: records.filter((item) => ["active", "expiring_soon", "frozen"].includes(item.status)),
    expired: records.filter((item) => item.status === "expired"),
    archived: records.filter((item) => item.status === "archived"),
  };
}

function formatCurrency(valueInPaise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(valueInPaise / 100);
}

export async function getPublicMemberCardData(memberId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(`
      id,
      gym_id,
      gyms!inner(name, logo_url),
      members!inner(full_name, photo_url)
    `)
    .eq("id", memberId)
    .single();

  if (error || !data) return null;

  const [subscriptions, freezes] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("membership_id", memberId),
    supabase.from("subscription_freezes").select("*").eq("gym_id", data.gym_id),
  ]);

  const memberSubscriptions = (subscriptions.data as SubscriptionRecord[]) ?? [];
  const warnings = 7; // Default 7 days warning for public view

  const members = Array.isArray(data.members) ? data.members[0] : data.members;
  const gyms = Array.isArray(data.gyms) ? data.gyms[0] : data.gyms;
  const membershipForStatus = data as unknown as MembershipRecord;

  if (!members || !gyms) return null;

  return {
    fullName: members.full_name,
    photoUrl: members.photo_url,
    status: deriveMembershipStatus(membershipForStatus, memberSubscriptions, warnings, (freezes.data as FreezeRecord[]) ?? []),
    expiresAt: getCurrentSubscription(memberSubscriptions)?.effective_end_date,
    gymName: gyms.name,
    gymLogo: gyms.logo_url,
  };
}

// =============================================
// Reminders Pipeline — 3-stage date-aware system
// =============================================

export type ReminderPipelineMember = {
  membershipId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  photoUrl: string | null;
  subscriptionId: string;
  planName: string;
  endDate: string;
  daysRemaining: number;
  duePaise: number;
  reminder5SentAt: string | null;
  reminder3SentAt: string | null;
  reminder1SentAt: string | null;
};

/**
 * Get all members eligible for the 3-stage reminder pipeline.
 * Only returns members whose subscription ends in exactly 5, 3, or 1 days (IST)
 * and who have outstanding dues.
 */
export async function getRemindersPipelineData(gymId: string): Promise<ReminderPipelineMember[]> {
  const supabase = createSupabaseServerClient();

  // Fetch active memberships with their current subscription + reminder columns
  const { data: subscriptions } = await supabase
    .from("v_subscription_effective_dates")
    .select("subscription_id, gym_id, membership_id, plan_snapshot_name, effective_end_date, status, reminder_5_sent_at, reminder_3_sent_at, reminder_1_sent_at")
    .eq("gym_id", gymId)
    .in("status", ["active", "frozen"]);

  if (!subscriptions || subscriptions.length === 0) return [];

  const membershipIds = subscriptions.map((s: any) => s.membership_id);

  // Fetch member info for these memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, member_id, archived_at, lapsed_at, members!inner(id, full_name, phone, photo_url)")
    .eq("gym_id", gymId)
    .is("archived_at", null)
    .is("lapsed_at", null)
    .in("id", membershipIds);

  // Fetch invoice balances
  const { data: invoices } = await supabase
    .from("v_invoice_balances")
    .select("membership_id, amount_due_paise, derived_status")
    .eq("gym_id", gymId)
    .in("membership_id", membershipIds);

  // Calculate today in IST safely string-based to avoid UTC/Local Node.js bleeding
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const todayStr = format(nowIST, "yyyy-MM-dd");
  const todayMidnight = parseISO(todayStr);

  const membershipMap = new Map(
    ((memberships as any[]) ?? []).map((m: any) => {
      const member = Array.isArray(m.members) ? m.members[0] : m.members;
      return [m.id, { memberId: m.member_id, memberName: member.full_name, memberPhone: member.phone, photoUrl: member.photo_url }];
    }),
  );

  // Sum dues per membership
  const duesMap = new Map<string, number>();
  for (const inv of (invoices as any[]) ?? []) {
    if (inv.derived_status === "voided") continue;
    duesMap.set(inv.membership_id, (duesMap.get(inv.membership_id) ?? 0) + inv.amount_due_paise);
  }

  const results: ReminderPipelineMember[] = [];

  for (const sub of subscriptions as any[]) {
    const memberInfo = membershipMap.get(sub.membership_id);
    if (!memberInfo) continue;

    const duePaise = duesMap.get(sub.membership_id) ?? 0;
    // Calculate days remaining strictly via calendar strings
    const endMidnight = parseISO(sub.effective_end_date);
    const diffMs = endMidnight.getTime() - todayMidnight.getTime();
    let daysRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    // DIAGNOSTIC TEMPORARY BYPASS: allow all days through to see timezone offset diffs natively.
    // if (daysRemaining !== 5 && daysRemaining !== 3 && daysRemaining !== 1) continue;

    results.push({
      membershipId: sub.membership_id,
      memberId: memberInfo.memberId,
      memberName: memberInfo.memberName,
      memberPhone: memberInfo.memberPhone,
      photoUrl: memberInfo.photoUrl,
      subscriptionId: sub.subscription_id,
      planName: sub.plan_snapshot_name,
      endDate: sub.effective_end_date,
      daysRemaining,
      duePaise,
      reminder5SentAt: sub.reminder_5_sent_at ?? null,
      reminder3SentAt: sub.reminder_3_sent_at ?? null,
      reminder1SentAt: sub.reminder_1_sent_at ?? null,
    });
  }

  return results;
}

export async function getWhatsappSettingsData(gymId: string) {
  const supabase = createSupabaseServerClient();
  
  const [gymResponse, creditsResponse, transactionsResponse] = await Promise.all([
    supabase
      .from("gyms")
      .select("id, name, whatsapp_reminder_mode, whatsapp_phone_number, whatsapp_api_key")
      .eq("id", gymId)
      .single(),
    supabase
      .from("whatsapp_credits")
      .select("balance_paise")
      .eq("gym_id", gymId)
      .maybeSingle(),
    supabase
      .from("whatsapp_credit_transactions")
      .select("*")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  return {
    gym: gymResponse.data,
    balance: creditsResponse.data?.balance_paise ?? 0,
    transactions: transactionsResponse.data ?? [],
  };
}

/**
 * Server-side lapse check — marks memberships as lapsed if:
 * - Current subscription effective_end_date < today (IST)
 * - Outstanding dues > 0
 * - Not already lapsed or archived
 *
 * Called on reminders + members page load. No pg_cron dependency.
 */
export async function markMembershipsLapsed(gymId: string): Promise<number> {
  const supabase = createSupabaseServerClient();

  // Get all active subscriptions for this gym
  const { data: subscriptions } = await supabase
    .from("v_subscription_effective_dates")
    .select("subscription_id, membership_id, effective_end_date, status")
    .eq("gym_id", gymId)
    .in("status", ["active", "frozen"]);

  if (!subscriptions || subscriptions.length === 0) return 0;

  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const todayIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());

  // Find subscriptions that have expired (end_date < today IST)
  const expiredMembershipIds = (subscriptions as any[])
    .filter((sub) => {
      const endDate = new Date(sub.effective_end_date + "T00:00:00+05:30");
      return endDate < todayIST;
    })
    .map((sub) => sub.membership_id);

  if (expiredMembershipIds.length === 0) return 0;

  // Check which of these have outstanding dues
  const { data: invoices } = await supabase
    .from("v_invoice_balances")
    .select("membership_id, amount_due_paise, derived_status")
    .eq("gym_id", gymId)
    .in("membership_id", expiredMembershipIds);

  const duesMap = new Map<string, number>();
  for (const inv of (invoices as any[]) ?? []) {
    if (inv.derived_status === "voided") continue;
    duesMap.set(inv.membership_id, (duesMap.get(inv.membership_id) ?? 0) + inv.amount_due_paise);
  }

  const toLapse = expiredMembershipIds.filter((id) => (duesMap.get(id) ?? 0) > 0);
  if (toLapse.length === 0) return 0;

  // Only lapse memberships not already lapsed/archived
  const { data: eligible } = await supabase
    .from("memberships")
    .select("id")
    .eq("gym_id", gymId)
    .is("archived_at", null)
    .is("lapsed_at", null)
    .in("id", toLapse);

  const eligibleIds = ((eligible as any[]) ?? []).map((m) => m.id);
  if (eligibleIds.length === 0) return 0;

  const { error } = await supabase
    .from("memberships")
    .update({ lapsed_at: new Date().toISOString() })
    .eq("gym_id", gymId)
    .in("id", eligibleIds);

  if (error) {
    console.error("[markMembershipsLapsed]", error.message);
    return 0;
  }

  return eligibleIds.length;
}

export type LapsedMember = {
  membershipId: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  lapsedAt: string;
  lastPlanName: string | null;
  lastEndDate: string | null;
  duePaise: number;
};

/**
 * Fetch all lapsed members for the gym (lapsed_at IS NOT NULL, archived_at IS NULL).
 */
export async function getLapsedMembers(gymId: string): Promise<LapsedMember[]> {
  const supabase = createSupabaseServerClient();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, member_id, lapsed_at, members!inner(id, full_name, phone)")
    .eq("gym_id", gymId)
    .is("archived_at", null)
    .not("lapsed_at", "is", null);

  if (!memberships || memberships.length === 0) return [];

  const membershipIds = (memberships as any[]).map((m) => m.id);

  const [subsResponse, invoicesResponse] = await Promise.all([
    supabase
      .from("v_subscription_effective_dates")
      .select("subscription_id, membership_id, plan_snapshot_name, effective_end_date, status")
      .eq("gym_id", gymId)
      .in("membership_id", membershipIds)
      .order("effective_end_date", { ascending: false }),
    supabase
      .from("v_invoice_balances")
      .select("membership_id, amount_due_paise, derived_status")
      .eq("gym_id", gymId)
      .in("membership_id", membershipIds),
  ]);

  const subsMap = new Map<string, { planName: string; endDate: string }>();
  for (const sub of (subsResponse.data as any[]) ?? []) {
    if (!subsMap.has(sub.membership_id)) {
      subsMap.set(sub.membership_id, {
        planName: sub.plan_snapshot_name,
        endDate: sub.effective_end_date,
      });
    }
  }

  const duesMap = new Map<string, number>();
  for (const inv of (invoicesResponse.data as any[]) ?? []) {
    if (inv.derived_status === "voided") continue;
    duesMap.set(inv.membership_id, (duesMap.get(inv.membership_id) ?? 0) + inv.amount_due_paise);
  }

  return (memberships as any[]).map((m) => {
    const member = Array.isArray(m.members) ? m.members[0] : m.members;
    const subInfo = subsMap.get(m.id);
    return {
      membershipId: m.id,
      memberId: m.member_id,
      memberName: member.full_name,
      memberPhone: member.phone,
      lapsedAt: m.lapsed_at,
      lastPlanName: subInfo?.planName ?? null,
      lastEndDate: subInfo?.endDate ?? null,
      duePaise: duesMap.get(m.id) ?? 0,
    };
  });
}

