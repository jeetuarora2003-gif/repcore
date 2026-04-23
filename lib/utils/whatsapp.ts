export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  if (!phone) return "#";
  const normalizedPhone = String(phone).replace(/[^\d]/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
