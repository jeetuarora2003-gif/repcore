"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { format, parse, parseISO, isValid, fromUnixTime } from "date-fns";

export type ColumnMapping = {
  userIdCol: number;   // 0-based column index
  dateCol: number;
  timeCol: number | null;  // null if datetime is combined in dateCol
};

export type ParsedAttendanceRow = {
  deviceUserId: string;
  checkInDate: string;   // "yyyy-MM-dd"
  checkedInAt: string;   // ISO timestamp
  rawDatetime: string;
};

export type UploadResult = {
  imported: number;
  unmatched: number;
  unmatchedIds: string[];
  error?: string;
};

// --- Date parsing helpers ---

function parseBiometricDatetime(dateRaw: string, timeRaw?: string): Date | null {
  const raw = timeRaw ? `${dateRaw.trim()} ${timeRaw.trim()}` : dateRaw.trim();

  // Pure unix timestamp
  if (/^\d{9,11}$/.test(raw)) {
    const d = fromUnixTime(Number(raw));
    return isValid(d) ? d : null;
  }

  // ISO / ISO-like: "2024-01-15 09:32:00"
  const iso = parseISO(raw.replace(" ", "T"));
  if (isValid(iso)) return iso;

  // "15/01/2024 09:32"
  for (const fmt of ["dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm"]) {
    try {
      const d = parse(raw, fmt, new Date());
      if (isValid(d)) return d;
    } catch {}
  }

  // "01/15/2024 09:32:00 AM" / "01/15/2024 09:32 AM"
  for (const fmt of ["MM/dd/yyyy hh:mm:ss a", "MM/dd/yyyy hh:mm a"]) {
    try {
      const d = parse(raw, fmt, new Date());
      if (isValid(d)) return d;
    } catch {}
  }

  return null;
}

// --- CSV / TXT row splitter ---
function splitRow(line: string): string[] {
  // Handle CSV with quoted fields
  if (line.includes(",")) {
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    return cols.map((c) => c.trim());
  }
  // Tab-separated (ADMS export format)
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  // Space-separated fallback
  return line.split(/\s{2,}/).map((c) => c.trim());
}

// --- Parse all rows using owner-specified column mapping ---
export function parseFileRows(
  rawText: string,
  mapping: ColumnMapping,
): ParsedAttendanceRow[] {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim());
  const results: ParsedAttendanceRow[] = [];

  for (const line of lines) {
    const cols = splitRow(line);
    const deviceUserId = cols[mapping.userIdCol]?.trim();
    const dateRaw = cols[mapping.dateCol]?.trim();
    const timeRaw = mapping.timeCol !== null ? cols[mapping.timeCol]?.trim() : undefined;

    if (!deviceUserId || !dateRaw) continue;
    // Skip header rows (non-numeric user IDs that look like "User ID", "No.", etc.)
    if (/^[a-z_\s]+$/i.test(deviceUserId)) continue;

    const parsed = parseBiometricDatetime(dateRaw, timeRaw);
    if (!parsed) continue;

    results.push({
      deviceUserId,
      checkInDate: format(parsed, "yyyy-MM-dd"),
      checkedInAt: parsed.toISOString(),
      rawDatetime: timeRaw ? `${dateRaw} ${timeRaw}` : dateRaw,
    });
  }

  return results;
}

// --- Server Action: Import attendance from parsed rows ---
export async function importBiometricFileAction(
  rows: ParsedAttendanceRow[],
): Promise<UploadResult> {
  const session = await getSessionContext();
  if (!session.user || !session.gym) {
    return { imported: 0, unmatched: 0, unmatchedIds: [], error: "Not authenticated" };
  }

  const gymId = session.gym.id;
  const supabase = createSupabaseServerClient();

  if (rows.length === 0) {
    return { imported: 0, unmatched: 0, unmatchedIds: [] };
  }

  // Fetch all memberships for this gym with their biometric_device_id
  const deviceIds = Array.from(new Set(rows.map((r) => r.deviceUserId)));

  const { data: members, error: membersError } = await supabase
    .from("memberships")
    .select("id, members!inner(biometric_device_id)")
    .eq("gym_id", gymId)
    .is("archived_at", null);

  if (membersError) {
    return { imported: 0, unmatched: 0, unmatchedIds: [], error: membersError.message };
  }

  type MemberRow = { id: string; members: { biometric_device_id: string | null } | { biometric_device_id: string | null }[] };
  const memberMap = new Map<string, string>(); // deviceUserId → membershipId

  for (const row of (members ?? []) as MemberRow[]) {
    const m = Array.isArray(row.members) ? row.members[0] : row.members;
    if (m?.biometric_device_id) {
      memberMap.set(m.biometric_device_id, row.id);
    }
  }

  const matched: Array<{
    gym_id: string;
    membership_id: string;
    check_in_date: string;
    checked_in_at: string;
    source: string;
    recorded_by: string;
  }> = [];

  const unmatchedLogs: Array<{
    gym_id: string;
    raw_device_user_id: string;
    raw_datetime: string;
    source: string;
  }> = [];

  const unmatchedIds = new Set<string>();

  for (const row of rows) {
    const membershipId = memberMap.get(row.deviceUserId);
    if (membershipId) {
      matched.push({
        gym_id: gymId,
        membership_id: membershipId,
        check_in_date: row.checkInDate,
        checked_in_at: row.checkedInAt,
        source: "biometric_upload",
        recorded_by: session.user.id,
      });
    } else {
      unmatchedIds.add(row.deviceUserId);
      unmatchedLogs.push({
        gym_id: gymId,
        raw_device_user_id: row.deviceUserId,
        raw_datetime: row.rawDatetime,
        source: "upload",
      });
    }
  }

  let importedCount = 0;
  if (matched.length > 0) {
    const { error: upsertError } = await supabase
      .from("attendance_logs")
      .upsert(matched, {
        onConflict: "membership_id,check_in_date",
        ignoreDuplicates: true,
      });

    if (upsertError) {
      return { imported: 0, unmatched: unmatchedIds.size, unmatchedIds: Array.from(unmatchedIds), error: upsertError.message };
    }
    importedCount = matched.length;
  }

  if (unmatchedLogs.length > 0) {
    await supabase.from("biometric_unmatched_logs").insert(unmatchedLogs);
  }

  revalidatePath("/attendance");

  return {
    imported: importedCount,
    unmatched: unmatchedIds.size,
    unmatchedIds: Array.from(unmatchedIds),
  };
}

// --- Server Action: Link an unmatched device ID to a member ---
export async function linkBiometricDeviceIdAction(
  memberId: string,
  deviceUserId: string,
): Promise<{ error?: string }> {
  const session = await getSessionContext();
  if (!session.user || !session.gym) return { error: "Not authenticated" };

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("members")
    .update({ biometric_device_id: deviceUserId })
    .eq("id", memberId)
    .eq("gym_id", session.gym.id);

  if (error) return { error: error.message };

  // Remove matched unmatched logs
  await supabase
    .from("biometric_unmatched_logs")
    .delete()
    .eq("gym_id", session.gym.id)
    .eq("raw_device_user_id", deviceUserId);

  revalidatePath("/attendance");
  revalidatePath("/settings");

  return {};
}
