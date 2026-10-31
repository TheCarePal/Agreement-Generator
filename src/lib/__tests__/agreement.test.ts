import { describe, expect, it } from "vitest";
import {
  COMPANY,
  SCOPE_GROUPS,
  SCOPE_ITEMS,
  agreementDraftSchema,
  agreementSchema,
  calculateFees,
  createAgreementDefaults,
  getSelectedScope,
  type AgreementData,
} from "../agreement";

function completeAgreement(overrides: Partial<AgreementData> = {}): AgreementData {
  return {
    ...createAgreementDefaults(),
    agreementDate: "2026-10-31",
    clientName: "Priya Sharma",
    clientAddress: "14 Test Road, Delhi",
    caregiverName: "Arjun Verma",
    caregiverAddress: "28 Example Lane, Delhi",
    signerName: "CarePal Authorized Signatory",
    serviceStartDate: "2026-11-09",
    paymentDueDate: "2026-11-08",
    ...overrides,
  };
}

describe("registration fee treatment", () => {
  it.each([
    { mode: "included", service: 19001, registration: 3999, total: 23000 },
    { mode: "additional", service: 23000, registration: 3999, total: 26999 },
    { mode: "already-paid", service: 23000, registration: 0, total: 23000 },
    { mode: "waived", service: 23000, registration: 0, total: 23000 },
  ] as const)("calculates the $mode first payment without double charging", ({ mode, service, registration, total }) => {
    const fees = calculateFees(completeAgreement({ registrationMode: mode }));
    expect(fees).toEqual({
      recurringFee: 23000,
      firstCycleServiceFee: service,
      registrationDue: registration,
      firstPaymentTotal: total,
    });
  });

  it("keeps additional charges and decimal totals at currency precision", () => {
    expect(calculateFees(completeAgreement({
      serviceFee: 23000.15,
      registrationFee: 3999.35,
      registrationMode: "additional",
    }))).toEqual({ recurringFee: 23000.15, firstCycleServiceFee: 23000.15, registrationDue: 3999.35, firstPaymentTotal: 26999.5 });
  });

  it("does not add an included fee twice when it has fractional rupees", () => {
    const fees = calculateFees(completeAgreement({ serviceFee: 23000.15, registrationFee: 3999.35 }));
    expect(fees.firstCycleServiceFee).toBe(19000.8);
    expect(fees.firstPaymentTotal).toBe(23000.15);
  });

  it("rejects an included registration fee greater than the first cycle bill", () => {
    const result = agreementSchema.safeParse(completeAgreement({ serviceFee: 3000, registrationFee: 3999 }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "registrationFee")).toBe(true);
  });

  it.each(["additional", "already-paid", "waived"] as const)("allows a larger recorded registration fee when mode is %s", (registrationMode) => {
    expect(agreementSchema.safeParse(completeAgreement({ serviceFee: 3000, registrationFee: 3999, registrationMode })).success).toBe(true);
  });
});

describe("agreement validation", () => {
  it("allows empty draft fields but requires the identity and service details for export", () => {
    const draft = createAgreementDefaults();
    expect(agreementDraftSchema.safeParse(draft).success).toBe(true);
    const result = agreementSchema.safeParse(draft);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(expect.arrayContaining(["clientName", "clientAddress", "signerName", "caregiverName", "caregiverAddress"]));
    }
    expect(agreementSchema.safeParse(completeAgreement()).success).toBe(true);
  });

  it("allows required dates to be temporarily empty only in drafts", () => {
    const draft = completeAgreement({ agreementDate: "", serviceStartDate: "", paymentDueDate: "" });
    expect(agreementDraftSchema.safeParse(draft).success).toBe(true);
    expect(agreementSchema.safeParse(draft).success).toBe(false);
  });

  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-2-01"])("rejects invalid calendar date %s", (agreementDate) => {
    expect(agreementDraftSchema.safeParse(completeAgreement({ agreementDate })).success).toBe(false);
  });

  it("rejects a service end date before the start date and accepts the same date", () => {
    expect(agreementSchema.safeParse(completeAgreement({ serviceEndDate: "2026-11-08" })).success).toBe(false);
    expect(agreementSchema.safeParse(completeAgreement({ serviceEndDate: "2026-11-09" })).success).toBe(true);
    expect(agreementSchema.safeParse(completeAgreement({ serviceEndDate: "" })).success).toBe(true);
  });

  it("requires payment before or on the service start date", () => {
    expect(agreementSchema.safeParse(completeAgreement({ paymentDueDate: "2026-11-10" })).success).toBe(false);
    expect(agreementSchema.safeParse(completeAgreement({ paymentDueDate: "2026-11-09" })).success).toBe(true);
    expect(agreementSchema.safeParse(completeAgreement({ paymentDueDate: "2026-11-08" })).success).toBe(true);
  });

  it.each([0, -1, 24.01, Infinity])("blocks invalid daily service hours %s in exports", (hoursPerDay) => {
    expect(agreementSchema.safeParse(completeAgreement({ hoursPerDay })).success).toBe(false);
  });

  it.each([0.5, 12, 24])("accepts daily service hours %s", (hoursPerDay) => {
    expect(agreementSchema.safeParse(completeAgreement({ hoursPerDay })).success).toBe(true);
  });

  it.each(["serviceFee", "registrationFee"] as const)("retains extra %s precision while editing but rejects it on export", (field) => {
    const data = completeAgreement({ registrationMode: "additional", [field]: 12.345 });
    expect(agreementDraftSchema.safeParse(data).success).toBe(true);
    const result = agreementSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field && /decimal places/.test(issue.message))).toBe(true);
  });

  it.each([12.34, 0.29])("accepts valid two-decimal money %s", (amount) => {
    expect(agreementSchema.safeParse(completeAgreement({ serviceFee: amount, registrationFee: amount })).success).toBe(true);
  });

  it.each([-1, NaN, Infinity])("rejects invalid fees %s even in drafts", (serviceFee) => {
    expect(agreementDraftSchema.safeParse(completeAgreement({ serviceFee })).success).toBe(false);
  });

  it("requires a payment method when exporting", () => {
    expect(agreementDraftSchema.safeParse(completeAgreement({ paymentMethods: [] })).success).toBe(true);
    expect(agreementSchema.safeParse(completeAgreement({ paymentMethods: [] })).success).toBe(false);
  });
});

describe("selected service scope", () => {
  it("returns only the selected duties under their original scope groups", () => {
    expect(getSelectedScope(completeAgreement({ selectedScopeIds: ["personal-care-2", "emergency-1"] }))).toEqual([
      { id: "personal-care", title: "Personal Care Assistance", items: [SCOPE_GROUPS[0].items[1]] },
      { id: "emergency", title: "Emergency Support", items: [SCOPE_GROUPS[6].items[0]] },
    ]);
  });

  it("includes every duty when selecting a complete scope group", () => {
    const selectedScopeIds = SCOPE_ITEMS.filter((item) => item.groupId === "mobility").map((item) => item.id);
    expect(getSelectedScope(completeAgreement({ selectedScopeIds }))).toEqual([
      { id: "mobility", title: "Mobility & Transfer Support", items: [...SCOPE_GROUPS[1].items] },
    ]);
  });

  it("requires a selected duty or additional custom duty for export", () => {
    const data = completeAgreement({ selectedScopeIds: [], additionalScope: "   " });
    expect(agreementDraftSchema.safeParse(data).success).toBe(true);
    expect(agreementSchema.safeParse(data).success).toBe(false);
    expect(agreementSchema.safeParse({ ...data, additionalScope: "Assist with reading each evening." }).success).toBe(true);
  });

  it("rejects unknown scope identifiers from stored drafts", () => {
    expect(agreementDraftSchema.safeParse(completeAgreement({ selectedScopeIds: ["unknown-duty"] })).success).toBe(false);
  });
});

describe("safe agreement defaults", () => {
  it("does not prefill sample client, patient, caregiver or signature identities", () => {
    const defaults = createAgreementDefaults();
    for (const field of ["clientName", "clientAddress", "clientPhone", "clientEmail", "patientName", "caregiverName", "caregiverAddress", "governmentIdProof", "signerName", "providerSignatureDate", "clientSignatureDate"] as const) {
      expect(defaults[field]).toBe("");
    }
  });

  it("does not claim verification or certification before they are confirmed", () => {
    expect(createAgreementDefaults()).toMatchObject({ certificationStatus: "Pending", policeVerification: "Pending" });
  });

  it("keeps the supplied registered office literal without adding an inferred address", () => {
    expect(COMPANY.registeredOffice).toBe("National Park");
  });

  it("returns independent scope and payment selections for new drafts", () => {
    const first = createAgreementDefaults();
    first.selectedScopeIds.pop();
    first.paymentMethods.pop();
    expect(createAgreementDefaults().selectedScopeIds).toHaveLength(SCOPE_ITEMS.length);
    expect(createAgreementDefaults().paymentMethods).toEqual(["Bank transfer", "UPI", "Credit card"]);
  });
});
