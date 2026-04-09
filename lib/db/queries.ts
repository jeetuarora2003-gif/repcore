import { addDays, endOfMonth, isAfter, isBefore, parseISO, startOfDay, startOfMonth } from "date-fns";
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

export async function getGymCoreData(gymId: string) {
  const supabase = createSupabaseServerClient();

  const [
    membershipsResponse,
    subscriptionsResponse,
    invoicesResponse,
    paymentsResponse,
    attendanceResponse,
    messageLogsResponse,
    freezesResponse,
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, gym_id, member_id, started_on, archived_at, archive_reason, members!inner(id, full_name, phone, photo_url, notes, joined_on, created_at)")
      .eq("gym_id", gymId)
      .order("started_on", { ascending: false }),
    supabase.from("v_subscription_effective_dates").select("*").eq("gym_id", gymId),
    supabase.from("v_invoice_balances").select("*").eq("gym_id", gymId),
    supabase.from("payments").select("*").eq("gym_id", gymId).order("received_on", { ascending: false }),
    supabase.from("attendance_logs").select("*").eq("gym_id", gymId).order("check_in_date", { ascending: false }),
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
  const { memberships, subscriptions, invoiceBalances, payments, attendanceLogs, messageLogs, freezes } = await getGymCoreData(gymId);
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

  return {
    records,
    activeMembersCount,
    expiringThisWeek,
    pendingDueAmount,
    monthlyRevenue,
    monthlyBreakdown,
    recentActivity,
    memberships: memberships.map((m) => ({
      id: m.id,
      members: { full_name: m.members.full_name, phone: m.members.phone },
    })),
  };
}

export async function getMembersPageData(gymId: string, warningDays: number, search = "", status = "all") {
  const { memberships, subscriptions, invoiceBalances, freezes } = await getGymCoreData(gymId);

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

  const supabase = createSupabaseServerClient();
  const bodyLogs = await supabase
    .from("member_body_logs")
    .select("*")
    .eq("membership_id", membership.id)
    .order("recorded_on", { ascending: false });

  return {
    ...membership,
    currentSubscription: getCurrentSubscription(memberSubscriptions),
    subscriptions: memberSubscriptions.sort((a, b) => b.start_date.localeCompare(a.start_date)),
    invoices: memberInvoices.sort((a, b) => b.issued_on.localeCompare(a.issued_on)),
    payments: memberPayments,
    attendance: memberAttendance,
    messages: memberMessages,
    bodyLogs: (bodyLogs.data ?? []) as { id: string; recorded_on: string; weight_kg: number | null; body_fat_percentage: number | null; biceps_cm: number | null; waist_cm: number | null; chest_cm: number | null }[],
    status: deriveMembershipStatus(membership, memberSubscriptions, warningDays, freezes),
  };
}

export async function getBillingPageData(gymId: string) {
  const supabase = createSupabaseServerClient();
  const [invoiceResponse, paymentResponse, creditResponse, membershipsResponse] = await Promise.all([
    supabase.from("v_invoice_balances").select("*").eq("gym_id", gymId).order("issued_on", { ascending: false }),
    supabase.from("v_payment_balances").select("*").eq("gym_id", gymId),
    supabase.from("v_membership_credit_balances").select("*").eq("gym_id", gymId),
    supabase
      .from("memberships")
      .select("id, member_id, archived_at, members!inner(id, full_name, phone)")
      .eq("gym_id", gymId)
      .is("archived_at", null),
  ]);

  return {
    invoices: (invoiceResponse.data as InvoiceBalance[]) ?? [],
    payments: (paymentResponse.data as PaymentBalanceRecord[]) ?? [],
    credits: (creditResponse.data as MembershipCreditBalanceRecord[]) ?? [],
    memberships: ((membershipsResponse.data as MembershipLookupRow[] | null) ?? []).map(normalizeMembershipLookupRow),
  };
}

export async function getAttendancePageData(gymId: string, date: string) {
  const supabase = createSupabaseServerClient();
  const [attendanceResponse, membershipsResponse] = await Promise.all([
    supabase
      .from("attendance_logs")
      .select("id, membership_id, check_in_date, checked_in_at, created_at")
      .eq("gym_id", gymId)
      .eq("check_in_date", date)
      .order("checked_in_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("id, member_id, archived_at, members!inner(id, full_name, phone)")
      .eq("gym_id", gymId)
      .is("archived_at", null),
  ]);

  return {
    attendance: (attendanceResponse.data as AttendanceRecord[]) ?? [],
    memberships: ((membershipsResponse.data as MembershipLookupRow[] | null) ?? []).map(normalizeMembershipLookupRow),
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

  const members = data.members as { full_name: string; photo_url: string | null };
  const gyms = data.gyms as { name: string; logo_url: string | null };
  const membershipForStatus = data as unknown as MembershipRecord;

  return {
    fullName: members.full_name,
    photoUrl: members.photo_url,
    status: deriveMembershipStatus(membershipForStatus, memberSubscriptions, warnings, (freezes.data as FreezeRecord[]) ?? []),
    expiresAt: getCurrentSubscription(memberSubscriptions)?.effective_end_date,
    gymName: gyms.name,
    gymLogo: gyms.logo_url,
  };
}
