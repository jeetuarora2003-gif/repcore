"use client";

import { useState, useCallback } from "react";
import { Upload, CheckCircle2, AlertTriangle, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseFileRows, importBiometricFileAction } from "@/lib/actions/attendance-upload";
import type { ColumnMapping, UploadResult } from "@/lib/actions/attendance-upload";

type FileMapperProps = {
  onComplete?: (result: UploadResult) => void;
};

const PREVIEW_ROWS = 5;

function splitRow(line: string): string[] {
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
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  return line.split(/\s{2,}/).map((c) => c.trim());
}

export function FileMapper({ onComplete }: FileMapperProps) {
  const [rawText, setRawText] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [colCount, setColCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({
    userIdCol: 0,
    dateCol: 1,
    timeCol: null,
  });
  const [result, setResult] = useState<UploadResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");

  const onFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, PREVIEW_ROWS + 1);
      const rows = lines.map(splitRow);
      setPreviewRows(rows.slice(0, PREVIEW_ROWS));
      setColCount(Math.max(...rows.map((r) => r.length), 1));
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleImport = async () => {
    if (!rawText) return;
    setImporting(true);
    try {
      const rows = parseFileRows(rawText, mapping);
      const res = await importBiometricFileAction(rows);
      setResult(res);
      setStep("done");
      onComplete?.(res);
    } finally {
      setImporting(false);
    }
  };

  const colOptions = Array.from({ length: colCount }, (_, i) => (
    <option key={i} value={i}>
      Column {i + 1}{previewRows[0]?.[i] ? ` ("${previewRows[0][i]}")` : ""}
    </option>
  ));

  const selectClass =
    "flex h-10 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (step === "done" && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-success">
              {result.imported} records imported
            </p>
            {result.unmatched > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {result.unmatched} unmatched user ID
                {result.unmatched !== 1 ? "s" : ""} — go to the Attendance page to link them.
              </p>
            )}
          </div>
        </div>

        {result.unmatchedIds.length > 0 && (
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-warning">
              Unmatched device IDs
            </p>
            <div className="flex flex-wrap gap-2">
              {result.unmatchedIds.map((id) => (
                <span
                  key={id}
                  className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-mono text-warning"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.error && (
          <p className="text-sm text-danger">{result.error}</p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => { setStep("upload"); setRawText(null); setResult(null); setPreviewRows([]); setFileName(""); }}
        >
          Upload another file
        </Button>
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Fingerprint className="h-4 w-4 text-accent" />
          <span className="font-medium text-foreground">{fileName}</span>
          <span>— {previewRows.length} preview rows shown</span>
        </div>

        {/* Preview table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white/[0.02]" : ""}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border-r border-border px-3 py-2 font-mono last:border-r-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Column mapping dropdowns */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>User ID column</Label>
            <select
              className={selectClass}
              value={mapping.userIdCol}
              onChange={(e) => setMapping((m) => ({ ...m, userIdCol: Number(e.target.value) }))}
            >
              {colOptions}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date / DateTime column</Label>
            <select
              className={selectClass}
              value={mapping.dateCol}
              onChange={(e) => setMapping((m) => ({ ...m, dateCol: Number(e.target.value) }))}
            >
              {colOptions}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Time column <span className="text-muted-foreground">(optional)</span></Label>
            <select
              className={selectClass}
              value={mapping.timeCol ?? ""}
              onChange={(e) =>
                setMapping((m) => ({ ...m, timeCol: e.target.value === "" ? null : Number(e.target.value) }))
              }
            >
              <option value="">— not separate —</option>
              {colOptions}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4" />
                Import records
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setStep("upload"); setRawText(null); setPreviewRows([]); setFileName(""); }}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border bg-white/[0.02] p-8 text-center transition-colors hover:border-accent/40 hover:bg-accent/5"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => document.getElementById("biometric-file-input")?.click()}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Drop your attendance export here</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports .txt and .csv — ZKTeco, eSSL, Realtime, Matrix export formats
        </p>
      </div>
      <Button variant="outline" size="sm" type="button">
        Choose file
      </Button>
      <input
        id="biometric-file-input"
        type="file"
        accept=".txt,.csv"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
