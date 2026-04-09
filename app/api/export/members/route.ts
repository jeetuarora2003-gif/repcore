import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { getMembersPageData } from "@/lib/db/queries";

export async function GET() {
  const session = await getSessionContext();
  if (!session.gym) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const members = await getMembersPageData(session.gym.id, session.settings?.expiring_warning_days ?? 7);
  const csv = [
    ["Name", "Phone", "Status", "Plan", "Due"],
    ...members.map((member) => [
      member.members.full_name,
      member.members.phone,
      member.status,
      member.currentSubscription?.plan_snapshot_name ?? "",
      `${member.duePaise / 100}`,
    ]),
  ]
    .map((row) => row.map((item) => `"${String(item).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="repcore-members.csv"',
    },
  });
}
