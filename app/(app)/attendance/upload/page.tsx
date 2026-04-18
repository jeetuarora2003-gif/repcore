import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileMapper } from "@/components/attendance/file-mapper";

export const dynamic = "force-dynamic";

export default async function AttendanceUploadPage() {
  const session = await getSessionContext();

  if (!session.user || !session.gym) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Attendance File"
        description="Upload a .txt or .csv export from your biometric device and map columns to import records."
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload device export</CardTitle>
          <CardDescription>
            Supported devices: ZKTeco, eSSL, Realtime, Matrix — use the attendance export or download option in your device software.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileMapper />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to export from your device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border bg-white/[0.03] p-4">
            <p className="font-medium text-foreground">ZKTeco / eSSL</p>
            <p className="mt-1">Software → Reports → Attendance Report → Export to Excel/CSV. Use the "Date" and "User ID" columns.</p>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.03] p-4">
            <p className="font-medium text-foreground">Realtime</p>
            <p className="mt-1">Realtime RMS → Reports → Attendance Log → Export. The file will be a .csv with Date/Time/User ID columns.</p>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.03] p-4">
            <p className="font-medium text-foreground">Matrix</p>
            <p className="mt-1">COSEC Web → Reports → Daily Attendance → Export CSV. Map "Enrollment No" as User ID.</p>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.03] p-4">
            <p className="font-medium text-foreground">Other brands</p>
            <p className="mt-1">Look for a "Download Logs" or "Attendance Report" option. Any tab-separated or comma-separated file with User ID and Date columns will work.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
