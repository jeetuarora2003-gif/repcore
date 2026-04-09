export type Entitlements = {
  planLabel: string;
  monthlyPrice: number;
  automatedWhatsapp: boolean;
  memberLimit: number;
  invoiceCorrections: boolean;
};

export const PLAN_ENTITLEMENTS: Record<"basic" | "growth", Entitlements> = {
  basic: {
    planLabel: "Basic",
    monthlyPrice: 249,
    automatedWhatsapp: false,
    memberLimit: 200,
    invoiceCorrections: false,
  },
  growth: {
    planLabel: "Growth",
    monthlyPrice: 449,
    automatedWhatsapp: true,
    memberLimit: 500,
    invoiceCorrections: true,
  },
};

export function getEntitlements(tier?: string | null) {
  return PLAN_ENTITLEMENTS[tier === "growth" ? "growth" : "basic"];
}
