"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Check, ChevronDown, ChevronUp, Fingerprint, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/utils/format";
import { linkBiometricDeviceIdAction } from "@/lib/actions/attendance-upload";

type UnmatchedLog = {
  id: string;
  raw_device_user_id: string;
  raw_datetime: string;
  created_at: string;
};

type MemberOption = {
  membershipId: string;
  memberId: string;
  fullName: string;
  phone: string;
};

type BiometricSettingsProps = {
  biometricToken: string | null;
  lastBiometricPush: string | null;
  unmatchedLogs: UnmatchedLog[];
  members: MemberOption[];
  domain: string;
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground active:scale-95"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? "Copy"}
    </button>
  );
}

function QrCodeImage({ url }: { url: string }) {
  // Use a URL-based QR API — no npm dependency needed
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=0a0a0a&color=f5f7fb&qzone=1&data=${encodeURIComponent(url)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrUrl}
      alt="QR code for biometric push URL"
      width={90}
      height={90}
      className="rounded-xl border border-border"
    />
  );
}

function AccordionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-white/[0.03]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

function LinkDeviceRow({ log, members }: { log: UnmatchedLog; members: MemberOption[] }) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [linked, setLinked] = useState(false);

  const handleLink = () => {
    if (!selectedMemberId) return;
    startTransition(async () => {
      const result = await linkBiometricDeviceIdAction(selectedMemberId, log.raw_device_user_id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Device ID linked to member");
        setLinked(true);
      }
    });
  };

  if (linked) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
        <Check className="h-4 w-4" />
        Device ID <span className="font-mono">{log.raw_device_user_id}</span> linked
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">{log.raw_device_user_id}</span>
        <span className="text-xs text-muted-foreground">seen {formatRelativeDate(log.created_at)}</span>
        <span className="text-xs text-muted-foreground">raw: {log.raw_datetime}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className="flex h-9 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
        >
          <option value="">— select member —</option>
          {members.map((m) => (
            <option key={m.memberId} value={m.memberId}>
              {m.fullName} ({m.phone})
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!selectedMemberId || isPending}
          onClick={handleLink}
        >
          {isPending ? "Linking…" : "Link"}
        </Button>
      </div>
    </div>
  );
}

export function BiometricSettings({
  biometricToken,
  lastBiometricPush,
  unmatchedLogs,
  members,
  domain,
}: BiometricSettingsProps) {
  const pushUrl = biometricToken
    ? `${domain}/api/biometric/push?token=${biometricToken}`
    : null;

  return (
    <div id="biometric" className="space-y-5">
      {/* Push URL + QR */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Push URL for your biometric device</p>
        {pushUrl ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="rounded-xl border border-border bg-black/30 px-4 py-3">
                <p className="break-all font-mono text-xs text-muted-foreground">{pushUrl}</p>
              </div>
              <CopyButton text={pushUrl} label="Copy URL" />
            </div>
            <QrCodeImage url={pushUrl} />
          </div>
        ) : (
          <p className="text-sm text-danger">Token not generated. Please contact support.</p>
        )}
      </div>

      {/* Last sync status */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-4 py-3">
        <Fingerprint className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <p className="text-sm">
          {lastBiometricPush ? (
            <>
              Last biometric push received:{" "}
              <span className="font-medium text-foreground">
                {formatRelativeDate(lastBiometricPush)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">No push received yet from any device.</span>
          )}
        </p>
      </div>

      {/* Setup instructions accordion */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Device setup instructions
        </p>
        <AccordionCard title="ZKTeco / eSSL / Realtime">
          <ol className="ml-4 list-decimal space-y-1.5">
            <li>Go to device <strong>Settings</strong> → <strong>Cloud Server Setup</strong> or <strong>ADMS Server</strong>.</li>
            <li>Set <strong>Server Address</strong> to the domain portion of your push URL.</li>
            <li>Set <strong>Server Path</strong> to <code className="rounded bg-white/[0.06] px-1">/api/biometric/push?token={biometricToken ?? "YOUR_TOKEN"}</code>.</li>
            <li>Enable <strong>Cloud Push</strong> or <strong>ADMS Push</strong> and save.</li>
            <li>Scan the QR code above with your phone to copy the full URL for the technician.</li>
          </ol>
        </AccordionCard>
        <AccordionCard title="Matrix COSEC">
          <ol className="ml-4 list-decimal space-y-1.5">
            <li>Open COSEC Web portal → <strong>Configuration</strong> → <strong>Web API</strong>.</li>
            <li>Enter the full push URL in the <strong>Webhook URL</strong> field.</li>
            <li>Set event type to <strong>Attendance</strong> and enable push.</li>
            <li>Save and restart the COSEC service.</li>
          </ol>
        </AccordionCard>
        <AccordionCard title="Other brands">
          <p>Look for one of these options in your device settings or companion software:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>ADMS / Cloud Server / Web Server</li>
            <li>Push URL / Webhook / HTTP Push</li>
            <li>Real-time Upload</li>
          </ul>
          <p className="mt-2">Enter the full push URL shown above into that field. If the device asks separately for domain and path, split the URL at the first <code className="rounded bg-white/[0.06] px-1">/</code> after the hostname.</p>
        </AccordionCard>
      </div>

      {/* File upload link */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-4 py-3">
        <Upload className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Manual file import</p>
          <p className="text-xs text-muted-foreground">
            Upload an attendance export (.txt or .csv) from any biometric device.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/attendance/upload">Upload file</Link>
        </Button>
      </div>

      {/* Unmatched IDs */}
      {unmatchedLogs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning">
            {unmatchedLogs.length} unmatched device ID{unmatchedLogs.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            These device user IDs were received but could not be matched to any member.
            Select a member next to each ID to link them — this will also set their Device Enrollment ID.
          </p>
          <div className="space-y-2">
            {unmatchedLogs.map((log) => (
              <LinkDeviceRow key={log.id} log={log} members={members} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
