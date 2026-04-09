import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

export function formatCurrency(valueInPaise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(valueInPaise / 100);
}

export function formatDate(value?: string | Date | null, pattern = "dd MMM yyyy") {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "-";
  return format(date, pattern);
}

export function formatRelativeDate(value?: string | null) {
  if (!value) return "-";
  return formatDistanceToNowStrict(parseISO(value), { addSuffix: true });
}

export function toPaise(value: string | number) {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value || "0");
  return Math.round(numeric * 100);
}

export function fromPaise(value: number) {
  return (value / 100).toFixed(2);
}
