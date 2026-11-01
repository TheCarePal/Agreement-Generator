import { describe, expect, it } from "vitest";
import { agreementSchema, createAgreementDefaults } from "../agreement";
import { createAgreementDraftFromArchive } from "../archive-draft";

describe("reusing archived agreement terms", () => {
  it("clears client, patient and caregiver identities and starts a new registration decision", () => {
    const saved = {
      ...createAgreementDefaults(),
      clientName: "Sample Client",
      clientAddress: "Sample address",
      clientPhone: "1234567890",
      clientEmail: "client@example.com",
      clientSalutation: "Mr." as const,
      patientName: "Sample Patient",
      clientRelationship: "Son",
      serviceAddress: "Care address",
      caregiverName: "Sample Caregiver",
      caregiverAddress: "Caregiver address",
      caregiverEducation: "GNM",
      governmentIdProof: "ID document",
      certificationStatus: "Yes" as const,
      policeVerification: "Done" as const,
      signerName: "Company Signer",
      providerSignatureDate: "2026-01-01",
      clientSignatureDate: "2026-01-01",
      agreementDate: "2026-01-01",
      serviceStartDate: "2026-01-01",
      paymentDueDate: "2026-01-01",
      serviceEndDate: "2026-02-01",
      registrationMode: "already-paid" as const,
      serviceFee: 30000,
    };
    expect(agreementSchema.safeParse(saved).success).toBe(true);
    const fresh = createAgreementDraftFromArchive(saved);
    for (const key of [
      "clientName",
      "clientAddress",
      "clientPhone",
      "clientEmail",
      "clientSalutation",
      "patientName",
      "clientRelationship",
      "serviceAddress",
      "caregiverName",
      "caregiverAddress",
      "caregiverEducation",
      "governmentIdProof",
      "providerSignatureDate",
      "clientSignatureDate",
      "serviceEndDate",
    ] as const)
      expect(fresh[key]).toBe("");
    expect(fresh).toMatchObject({
      certificationStatus: "Pending",
      policeVerification: "Pending",
      registrationMode: "included",
      serviceFee: 30000,
      signerName: "Company Signer",
      selectedScopeIds: saved.selectedScopeIds,
    });
    expect(fresh.agreementDate).toBe(createAgreementDefaults().agreementDate);
    expect(saved.clientName).toBe("Sample Client");
  });
  it("rejects incomplete archived data", () => {
    expect(() =>
      createAgreementDraftFromArchive({ clientName: "Sample Client" }),
    ).toThrow();
  });
});
