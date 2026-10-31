import { z } from "zod";

export const COMPANY = {
  brandName: "The CarePal",
  legalName: "Carepalz Internet Private Limited",
  cin: "U86900OD2025PTC048935",
  pan: "AAMCC6493N",
  registeredOffice: "National Park",
  location: "Delhi, India",
  website: "https://thecarepal.com/",
  email: "support@thecarepal.com",
  phone: "8435896270",
} as const;

export const AGREEMENT_TERMS = {
  cancellationHours: 72,
  earlyRefundPercent: 90,
  lateRefundPercent: 50,
  providerRefundPercent: 100,
  refundRequestDays: 7,
  refundProcessingMinDays: 10,
  refundProcessingMaxDays: 15,
  terminationNoticeDays: 30,
  arbitrationCity: "Kolkata",
} as const;

export const SCOPE_GROUPS = [
  {
    id: "personal-care",
    title: "Personal Care Assistance",
    items: [
      "Assistance with bathing and sponge baths",
      "Grooming, dressing, and personal hygiene",
      "Toileting and continence care",
      "Assistance with changing adult diapers, if required",
    ],
  },
  {
    id: "mobility",
    title: "Mobility & Transfer Support",
    items: [
      "Assisting with walking and mobility",
      "Helping with sitting, standing, and repositioning",
      "Support with wheelchair transfers and fall prevention",
      "Light mobility exercises as advised by the family or physician",
    ],
  },
  {
    id: "medication",
    title: "Medication Support",
    items: [
      "Timely medication reminders",
      "Assisting with medication organisation (without administering injections or prescribing medicines)",
      "Monitoring adherence to prescribed medication schedules",
    ],
  },
  {
    id: "companionship",
    title: "Companionship & Emotional Support",
    items: [
      "Providing companionship and engagement",
      "Conversing and offering emotional support",
      "Reading, light recreational activities, and encouraging social interaction",
    ],
  },
  {
    id: "health-monitoring",
    title: "Health Monitoring",
    items: [
      "Observing and reporting changes in the patient's condition",
      "Monitoring vital signs, if trained and instructed",
      "Reporting concerns promptly to family members and CarePal",
    ],
  },
  {
    id: "daily-living",
    title: "Daily Living Support",
    items: [
      "Assisting with routine activities of daily living (ADLs)",
      "Helping maintain a comfortable and safe environment around the patient",
      "Accompanying the patient within the home premises",
    ],
  },
  {
    id: "emergency",
    title: "Emergency Support",
    items: [
      "Providing immediate assistance during emergencies",
      "Promptly notifying family members and CarePal's escalation team in case of any medical or safety concerns",
    ],
  },
] as const;

export const SCOPE_ITEMS = SCOPE_GROUPS.flatMap((group) =>
  group.items.map((text, index) => ({
    id: `${group.id}-${index + 1}`,
    text,
    groupId: group.id,
  })),
);
export const PAYMENT_METHODS = [
  "Bank transfer",
  "UPI",
  "Credit card",
  "Cash",
] as const;
export const REGISTRATION_MODES = [
  { value: "included", label: "Included in first bill" },
  { value: "additional", label: "Add to first bill" },
  { value: "already-paid", label: "Already paid" },
  { value: "waived", label: "Waived" },
] as const;

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
};
const draftDate = z
  .string()
  .refine((value) => !value || isValidDate(value), "Enter a valid date.");
const requiredDate = z.string().refine(isValidDate, "Choose a valid date.");
const amount = z
  .number()
  .finite()
  .min(0, "Use a positive amount or zero.")
  .max(1_000_000_000);
const requiredText = (label: string, limit = 180) =>
  z.string().trim().min(1, `Enter ${label}.`).max(limit);

export const agreementDraftSchema = z.object({
  agreementDate: draftDate,
  clientSalutation: z.enum(["", "Mr.", "Mrs.", "Ms.", "Mx.", "Dr."]),
  clientName: z.string().max(180),
  clientAddress: z.string().max(1500),
  clientPhone: z.string().max(60),
  clientEmail: z.string().max(254),
  patientName: z.string().max(180),
  clientRelationship: z.string().max(120),
  serviceAddress: z.string().max(1500),
  serviceType: z.string().max(180),
  serviceDescription: z.string().max(2000),
  caregiverRole: z.string().max(120),
  serviceStartDate: draftDate,
  serviceEndDate: draftDate,
  hoursPerDay: z.number().finite().min(0).max(24),
  serviceFee: amount,
  billingCycle: z.enum(["Monthly", "Weekly", "Daily"]),
  registrationFee: amount,
  registrationMode: z.enum([
    "included",
    "additional",
    "already-paid",
    "waived",
  ]),
  paymentDueDate: draftDate,
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).max(PAYMENT_METHODS.length),
  signerName: z.string().max(180),
  signerTitle: z.string().max(180),
  providerSignatureDate: draftDate,
  clientSignatureDate: draftDate,
  caregiverName: z.string().max(180),
  caregiverAddress: z.string().max(1500),
  caregiverEducation: z.string().max(300),
  certificationStatus: z.enum(["Yes", "No", "Pending", "Not applicable"]),
  governmentIdProof: z.string().max(500),
  policeVerification: z.enum([
    "Done",
    "Pending",
    "Not provided",
    "Not applicable",
  ]),
  selectedScopeIds: z
    .array(
      z
        .string()
        .refine(
          (id) => SCOPE_ITEMS.some((item) => item.id === id),
          "Unknown scope item.",
        ),
    )
    .max(SCOPE_ITEMS.length),
  additionalScope: z.string().max(3000),
});

export type AgreementData = z.infer<typeof agreementDraftSchema>;

export const agreementSchema = agreementDraftSchema
  .extend({
    agreementDate: requiredDate,
    clientName: requiredText("the client's full name"),
    clientAddress: requiredText("the client's address", 1500),
    clientEmail: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .or(z.literal("")),
    serviceType: requiredText("a service type"),
    serviceDescription: requiredText("the service description", 2000),
    caregiverRole: requiredText("the caregiver's role", 120),
    serviceStartDate: requiredDate,
    paymentDueDate: requiredDate,
    hoursPerDay: z
      .number()
      .finite()
      .gt(0, "Daily service hours must be greater than zero.")
      .max(24, "Daily service hours cannot exceed 24."),
    paymentMethods: z
      .array(z.enum(PAYMENT_METHODS))
      .min(1, "Select at least one payment method.")
      .max(PAYMENT_METHODS.length),
    signerName: requiredText("the authorized signatory's name"),
    signerTitle: requiredText("the signatory's designation"),
    caregiverName: requiredText("the caregiver's full name"),
    caregiverAddress: requiredText("the caregiver's address", 1500),
  })
  .superRefine((data, context) => {
    for (const field of ["serviceFee", "registrationFee"] as const) {
      if (
        Math.abs(data[field] * 100 - Math.round(data[field] * 100)) > 0.00001
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Use no more than two decimal places.",
        });
      }
    }
    if (
      data.registrationMode === "included" &&
      data.registrationFee > data.serviceFee
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationFee"],
        message:
          "An included registration fee cannot exceed the first bill. Choose 'Add to first bill' or reduce the fee.",
      });
    }
    if (
      data.serviceEndDate &&
      isValidDate(data.serviceStartDate) &&
      data.serviceEndDate < data.serviceStartDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceEndDate"],
        message: "The service end date cannot be before the start date.",
      });
    }
    if (
      isValidDate(data.paymentDueDate) &&
      isValidDate(data.serviceStartDate) &&
      data.paymentDueDate > data.serviceStartDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentDueDate"],
        message:
          "Payment is due in advance. Choose a date on or before the service start date.",
      });
    }
    if (!data.selectedScopeIds.length && !data.additionalScope.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedScopeIds"],
        message: "Select at least one duty or add an additional duty.",
      });
    }
  });

export function createAgreementDefaults(): AgreementData {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return {
    agreementDate: today,
    clientSalutation: "",
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    clientEmail: "",
    patientName: "",
    clientRelationship: "",
    serviceAddress: "",
    serviceType: "Caregiving",
    serviceDescription: "Non-clinical assistance and caregiving support.",
    caregiverRole: "Caregiver",
    serviceStartDate: today,
    serviceEndDate: "",
    hoursPerDay: 24,
    serviceFee: 23000,
    billingCycle: "Monthly",
    registrationFee: 3999,
    registrationMode: "included",
    paymentDueDate: today,
    paymentMethods: ["Bank transfer", "UPI", "Credit card"],
    signerName: "",
    signerTitle: "Founder's Office",
    providerSignatureDate: "",
    clientSignatureDate: "",
    caregiverName: "",
    caregiverAddress: "",
    caregiverEducation: "",
    certificationStatus: "Pending",
    governmentIdProof: "",
    policeVerification: "Pending",
    selectedScopeIds: SCOPE_ITEMS.map((item) => item.id),
    additionalScope: "",
  };
}

const currencyRound = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateFees(data: AgreementData) {
  const recurringFee = currencyRound(data.serviceFee);
  const registrationDue = ["included", "additional"].includes(
    data.registrationMode,
  )
    ? currencyRound(data.registrationFee)
    : 0;
  const firstCycleServiceFee = currencyRound(
    data.registrationMode === "included"
      ? recurringFee - registrationDue
      : recurringFee,
  );
  return {
    recurringFee,
    registrationDue,
    firstCycleServiceFee,
    firstPaymentTotal: currencyRound(firstCycleServiceFee + registrationDue),
  };
}

export function getSelectedScope(data: AgreementData) {
  return SCOPE_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    items: group.items.filter((_, index) =>
      data.selectedScopeIds.includes(`${group.id}-${index + 1}`),
    ),
  })).filter((group) => group.items.length > 0);
}

export function formatMoney(value: number): string {
  return `Rs. ${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string): string {
  return isValidDate(value)
    ? new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not specified";
}

export function billingPeriod(value: AgreementData["billingCycle"]): string {
  return { Monthly: "month", Weekly: "week", Daily: "day" }[value];
}
