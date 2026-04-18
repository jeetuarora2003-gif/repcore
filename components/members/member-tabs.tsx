"use client";

import { useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";
import type { ReactNode } from "react";

type Props = {
  defaultTab: string;
  memberId: string;
  profileForm: ReactNode;
  archiveButton: ReactNode;
  idCard: ReactNode;
  attendancePreview: ReactNode;
  renewForm: ReactNode;
  invoicesCard: ReactNode;
  paymentsCard: ReactNode;
  attendance: { id: string; check_in_date: string; checked_in_at: string }[];
  messages: { id: string; channel: string; created_at: string; rendered_body: string }[];
};

export function MemberTabs({
  defaultTab,
  memberId,
  profileForm,
  archiveButton,
  idCard,
  attendancePreview,
  renewForm,
  invoicesCard,
  paymentsCard,
  attendance,
  messages,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (value: string) => {
    const url = value === "overview" ? pathname : `${pathname}?tab=${value}`;
    router.replace(url, { scroll: false });
  };

  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-white/[0.03] p-1 h-12">
        <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-glow">Overview</TabsTrigger>
        <TabsTrigger value="billing" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-glow">Billing</TabsTrigger>
        <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-glow">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent>
              {profileForm}
              <div className="mt-4">{archiveButton}</div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            {idCard}
            {attendancePreview}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="billing" className="space-y-6 mt-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {renewForm}
          <div className="space-y-6">
            {invoicesCard}
            {paymentsCard}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="activity" className="space-y-6 mt-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Attendance history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {attendance.length ? (
                attendance.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                    <p className="font-medium">{formatDate(entry.check_in_date)}</p>
                    <p className="mt-1 text-muted-foreground">Checked in at {formatDate(entry.checked_in_at, "hh:mm a")}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No attendance logged yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Reminder history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {messages.length ? (
                messages.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                    <p className="font-medium">{log.channel.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-muted-foreground">{formatDate(log.created_at, "dd MMM, hh:mm a")}</p>
                    <p className="mt-3 line-clamp-3 text-foreground/90">{log.rendered_body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No reminder history yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
