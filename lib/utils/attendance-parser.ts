import { format, parse, parseISO, isValid, fromUnixTime } from "date-fns";

export type ColumnMapping = {
  userIdCol: number;
  dateCol: number;
  timeCol: number | null;
};

export type ParsedAttendanceRow = {
  deviceUserId: string;
  checkInDate: string;
  checkedInAt: string;
  rawDatetime: string;
};

export function parseBiometricDatetime(dateRaw: string, timeRaw?: string): Date | null {
  const raw = timeRaw ? `${dateRaw.trim()} ${timeRaw.trim()}` : dateRaw.trim();

  if (/^\d{9,11}$/.test(raw)) {
    const d = fromUnixTime(Number(raw));
    return isValid(d) ? d : null;
  }

  const iso = parseISO(raw.replace(" ", "T"));
  if (isValid(iso)) return iso;

  for (const fmt of ["dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm"]) {
    try {
      const d = parse(raw, fmt, new Date());
      if (isValid(d)) return d;
    } catch {}
  }

  for (const fmt of ["MM/dd/yyyy hh:mm:ss a", "MM/dd/yyyy hh:mm a"]) {
    try {
      const d = parse(raw, fmt, new Date());
      if (isValid(d)) return d;
    } catch {}
  }

  return null;
}

export function splitRow(line: string): string[] {
  if (line.includes(",")) {
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (const ch of line) {
      if (ch === "\""") { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    return cols.map((c) => c.trim());
  }
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  return line.split(/\s{2,}/).map((c) => c.trim());
}

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
    if (/^[a-z_\s]+$/.test(deviceUserId)) continue;

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

