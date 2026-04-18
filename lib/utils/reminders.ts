import { formatDate } from "@/lib/utils/format";

// --- Stage-specific WhatsApp message templates ---

const STAGE_TEMPLATES: Record<number | "lapsed", string> = {
  5: "Hi [Name], your membership at [Gym] expires in 5 days on [Date]. Renew soon to avoid interruption. - [Owner]",
  3: "Hi [Name], your membership expires in 3 days on [Date]. Please renew at the earliest. - [Owner]",
  1: "Hi [Name], your membership expires TODAY. Please visit or contact us to renew. - [Owner]",
  lapsed:
    "Hi [Name], your membership at [Gym] has expired. We'd love to have you back — contact us to rejoin.",
};

type ReminderVars = {
  name: string;
  gymName: string;
  ownerName?: string;
  date?: string | null;
};

/** Build a stage-aware WhatsApp message. */
export function buildReminderMessage(
  stage: 5 | 3 | 1 | "lapsed",
  vars: ReminderVars,
): string {
  const template = STAGE_TEMPLATES[stage];
  return template
    .replaceAll("[Name]", vars.name)
    .replaceAll("[Gym]", vars.gymName)
    .replaceAll("[Owner]", vars.ownerName ?? vars.gymName)
    .replaceAll("[Date]", vars.date ? formatDate(vars.date, "dd MMM yyyy") : "");
}

/** Legacy template renderer — kept for backward compatibility. */
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
