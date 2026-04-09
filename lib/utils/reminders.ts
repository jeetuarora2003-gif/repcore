import { formatDate } from "@/lib/utils/format";

export function renderReminderTemplate(
  template: string,
  values: {
    name: string;
    gymName: string;
    phone: string;
    date?: string | null;
  },
) {
  return template
    .replaceAll("[Name]", values.name)
    .replaceAll("[Gym Name]", values.gymName)
    .replaceAll("[Phone]", values.phone)
    .replaceAll("[Date]", values.date ? formatDate(values.date, "dd MMM yyyy") : "");
}
