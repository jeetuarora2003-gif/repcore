import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = loginSchema.extend({
  fullName: z.string().min(2),
});

export const onboardingSchema = z.object({
  orgName: z.string().min(2),
  gymName: z.string().min(2),
  gymPhone: z.string().min(8),
  gymAddress: z.string().optional().default(""),
  timezone: z.string().default("Asia/Kolkata"),
  firstPlanName: z.string().min(2),
  firstPlanDurationDays: z.coerce.number().int().positive(),
  firstPlanPriceRupees: z.coerce.number().nonnegative(),
  renewalMode: z.enum(["continue_from_last_end", "restart_from_today"]).default("continue_from_last_end"),
  gstEnabled: z.coerce.boolean().default(false),
});

export const membershipPlanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  durationDays: z.coerce.number().int().positive(),
  priceRupees: z.coerce.number().nonnegative(),
  isActive: z.coerce.boolean().optional(),
});

export const memberProfileSchema = z.object({
  memberId: z.string().uuid().optional(),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional().default(""),
});

export const membershipSaleSchema = memberProfileSchema.extend({
  existingMemberId: z.string().uuid().optional(),
  planId: z.string().uuid(),
  startDate: z.string().min(1),
  saleReason: z.enum(["new_join", "rejoin"]).default("new_join"),
  paidAmountRupees: z.coerce.number().nonnegative().optional().default(0),
  paymentMethod: z.enum(["cash", "upi", "card", "bank_transfer", "other"]).optional().default("cash"),
  paymentReference: z.string().optional().default(""),
});

export const renewSubscriptionSchema = z.object({
  membershipId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string().optional(),
  notes: z.string().optional().default(""),
});

export const freezeSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  freezeStartDate: z.string().min(1),
  freezeEndDate: z.string().min(1),
  reason: z.string().optional().default(""),
});

export const paymentAllocationSchema = z.object({
  invoiceId: z.string().uuid(),
  amountRupees: z.coerce.number().positive(),
});

export const recordPaymentSchema = z.object({
  membershipId: z.string().uuid(),
  amountRupees: z.coerce.number().positive(),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "other"]),
  receivedOn: z.string().min(1),
  referenceCode: z.string().optional().default(""),
  note: z.string().optional().default(""),
  allocations: z.array(paymentAllocationSchema).default([]),
});

export const applyCreditSchema = z.object({
  membershipId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amountRupees: z.coerce.number().positive(),
  note: z.string().optional().default(""),
});

export const correctInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  replacementAmountRupees: z.coerce.number().nonnegative(),
  reason: z.string().min(2),
  notes: z.string().optional().default(""),
});

export const attendanceSchema = z.object({
  membershipId: z.string().uuid(),
  checkInDate: z.string().min(1),
});

export const gymProfileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  address: z.string().optional().default(""),
  logoUrl: z.string().url().optional().or(z.literal("")),
  gstNumber: z.string().optional().default(""),
});

export const gymSettingsSchema = z.object({
  expiringWarningDays: z.coerce.number().int().min(1).max(30),
  renewalMode: z.enum(["continue_from_last_end", "restart_from_today"]),
  freezeBlocksCheckin: z.coerce.boolean().default(true),
  gstEnabled: z.coerce.boolean().default(false),
});

export const reminderTemplateSchema = z.object({
  templateType: z.enum(["fee_due", "membership_expiry", "welcome"]),
  body: z.string().min(10),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const whatsappConfigSchema = z.object({
  mode: z.enum(["manual", "auto"]),
  phone: z.string().optional(),
  apiKey: z.string().optional(),
});

export const addCreditsSchema = z.object({
  amountPaise: z.coerce.number().int().min(5000), // Min ₹50
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
