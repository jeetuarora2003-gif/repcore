"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ParsedAttendanceRow } from "@/lib/utils/attendance-parser";
export type { ColumnMapping, ParsedAttendanceRow } from "@/lib/utils/attendance-parser";

export type UploadResult = {
  imported: number;
  unmatched: number;
  unmatchedIds: string[];
  error?: string;
};

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
