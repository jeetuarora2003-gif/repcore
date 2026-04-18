import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { format, parse, parseISO, isValid, fromUnixTime } from "date-fns";

// ZKTeco ADMS / eSSL / Realtime / Matrix push webhook
// Auth: per-gym secret token in URL query param: ?token=GYM_TOKEN
// Writes to: attendance_logs (source='biometric_push')
// Unmatched device IDs: biometric_unmatched_logs
//
// Supported body formats:
//   1. application/x-www-form-urlencoded  — ADMS standard
//      Data field: "USER_ID\tYYYY-MM-DD HH:mm:ss\tIO_STATE\tVERIFY_TYPE\tSERIAL_NUMBER"
//   2. application/json — newer ZKTeco firmware and some Matrix devices

type ParsedRecord = {
  deviceUserId: string;
  rawDatetime: string;
  checkInDate: string;  // "yyyy-MM-dd"
  checkedInAt: string;  // ISO timestamp
};

// Try all common date formats used by biometric devices
function parseBiometricDatetime(raw: string): Date | null {
  const trimmed = raw.trim();

  // Unix timestamp (pure integer string)
  if (/^\d{9,11}$/.test(trimmed)) {
    const d = fromUnixTime(Number(trimmed));
    return isValid(d) ? d : null;
  }

  // ISO-like: "2024-01-15 09:32:00" or "2024-01-15T09:32:00"
  const iso = parseISO(trimmed.replace(" ", "T"));
  if (isValid(iso)) return iso;

  // "15/01/2024 09:32" — DD/MM/YYYY HH:mm
  try {
    const d1 = parse(trimmed, "dd/MM/yyyy HH:mm", new Date());
    if (isValid(d1)) return d1;
  } catch {}

  // "01/15/2024 09:32:00 AM" — US format with AM/PM
  try {
    const d2 = parse(trimmed, "MM/dd/yyyy hh:mm:ss a", new Date());
    if (isValid(d2)) return d2;
  } catch {}

  // "01/15/2024 09:32 AM"
  try {
    const d3 = parse(trimmed, "MM/dd/yyyy hh:mm a", new Date());
    if (isValid(d3)) return d3;
  } catch {}

  return null;
}

// Parse ADMS tab-delimited Data field
// Format: USER_ID\tDATETIME\tIO_STATE\tVERIFY_TYPE\tSERIAL_NUMBER
function parseAdmsData(raw: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 2) continue;

    const deviceUserId = parts[0]?.trim();
    const rawDatetime = parts[1]?.trim();

    if (!deviceUserId || !rawDatetime) continue;

    const parsed = parseBiometricDatetime(rawDatetime);
    if (!parsed) continue;

    records.push({
      deviceUserId,
      rawDatetime,
      checkInDate: format(parsed, "yyyy-MM-dd"),
      checkedInAt: parsed.toISOString(),
    });
  }

  return records;
}

// Parse JSON body from newer devices
// Expected shape: { records: [{ user_id, datetime }] } or { user_id, datetime }
function parseJsonBody(body: unknown): ParsedRecord[] {
  const records: ParsedRecord[] = [];

  const entries: Array<{ user_id?: unknown; datetime?: unknown; userId?: unknown; timestamp?: unknown }> = [];

  if (Array.isArray(body)) {
    entries.push(...body);
  } else if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (Array.isArray(obj.records)) {
      entries.push(...(obj.records as typeof entries));
    } else {
      entries.push(obj as typeof entries[number]);
    }
  }

  for (const entry of entries) {
    const deviceUserId = String(entry.user_id ?? entry.userId ?? "").trim();
    const rawDatetime = String(entry.datetime ?? entry.timestamp ?? "").trim();

    if (!deviceUserId || !rawDatetime) continue;

    const parsed = parseBiometricDatetime(rawDatetime);
    if (!parsed) continue;

    records.push({
      deviceUserId,
      rawDatetime,
      checkInDate: format(parsed, "yyyy-MM-dd"),
      checkedInAt: parsed.toISOString(),
    });
  }

  return records;
}

export async function POST(request: NextRequest) {
  // 1. Authenticate via per-gym token
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    // ZKTeco still needs HTTP 200 to not retry forever — but send a signal
    return new NextResponse("INVALID_TOKEN", { status: 200 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id")
    .eq("biometric_token", token)
    .maybeSingle();

  if (gymError || !gym) {
    return new NextResponse("INVALID_TOKEN", { status: 200 });
  }

  const gymId = gym.id as string;

  // 2. Parse body — support both ADMS form and JSON
  const contentType = request.headers.get("content-type") ?? "";
  let parsedRecords: ParsedRecord[] = [];

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const data = params.get("Data") ?? params.get("data") ?? "";
    parsedRecords = parseAdmsData(data);
  } else {
    // JSON fallback
    try {
      const json = await request.json();
      parsedRecords = parseJsonBody(json);
    } catch {
      return new NextResponse("OK", { status: 200 });
    }
  }

  if (parsedRecords.length === 0) {
    return new NextResponse("OK", { status: 200 });
  }

  // 3. Look up members by biometric_device_id for this gym
  const deviceIds = Array.from(new Set(parsedRecords.map((r) => r.deviceUserId)));

  const { data: members } = await supabase
    .from("memberships")
    .select("id, members!inner(biometric_device_id)")
    .eq("gym_id", gymId)
    .is("archived_at", null)
    .in("members.biometric_device_id", deviceIds);

  type MemberRow = { id: string; members: { biometric_device_id: string | null } | { biometric_device_id: string | null }[] };
  const memberMap = new Map<string, string>(); // deviceUserId → membershipId

  for (const row of (members ?? []) as MemberRow[]) {
    const m = Array.isArray(row.members) ? row.members[0] : row.members;
    if (m?.biometric_device_id) {
      memberMap.set(m.biometric_device_id, row.id);
    }
  }

  // 4. Split into matched and unmatched
  const matched: Array<{
    gym_id: string;
    membership_id: string;
    check_in_date: string;
    checked_in_at: string;
    source: string;
    recorded_by: null;
  }> = [];

  const unmatched: Array<{
    gym_id: string;
    raw_device_user_id: string;
    raw_datetime: string;
    source: string;
  }> = [];

  for (const record of parsedRecords) {
    const membershipId = memberMap.get(record.deviceUserId);
    if (membershipId) {
      matched.push({
        gym_id: gymId,
        membership_id: membershipId,
        check_in_date: record.checkInDate,
        checked_in_at: record.checkedInAt,
        source: "biometric_push",
        recorded_by: null,
      });
    } else {
      unmatched.push({
        gym_id: gymId,
        raw_device_user_id: record.deviceUserId,
        raw_datetime: record.rawDatetime,
        source: "push",
      });
    }
  }

  // 5. Upsert matched attendance logs (ignore duplicates for same day)
  if (matched.length > 0) {
    await supabase.from("attendance_logs").upsert(matched, {
      onConflict: "membership_id,check_in_date",
      ignoreDuplicates: true,
    });
  }

  // 6. Insert unmatched logs for manual review
  if (unmatched.length > 0) {
    await supabase.from("biometric_unmatched_logs").insert(unmatched);
  }

  // 7. ZKTeco ADMS protocol requires exactly: HTTP 200 + body "OK"
  return new NextResponse("OK", { status: 200 });
}

// ZKTeco also sends GET requests to verify the server is alive
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return new NextResponse("OK", { status: 200 });

  const supabase = createSupabaseServiceClient();
  const { data: gym } = await supabase
    .from("gyms")
    .select("id")
    .eq("biometric_token", token)
    .maybeSingle();

  return new NextResponse(gym ? "OK" : "INVALID_TOKEN", { status: 200 });
}
