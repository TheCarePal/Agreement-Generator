import {
  agreementSchema,
  createAgreementDefaults,
  type AgreementData,
} from "./agreement";

/** A new client must not inherit another client's identity or registration payment. */
export function createAgreementDraftFromArchive(
  snapshot: unknown,
): AgreementData {
  const saved = agreementSchema.parse(snapshot);
  const defaults = createAgreementDefaults();
  return {
    ...saved,
    clientName: "",
    clientSalutation: "",
    clientAddress: "",
    clientPhone: "",
    clientEmail: "",
    patientName: "",
    clientRelationship: "",
    serviceAddress: "",
    agreementDate: defaults.agreementDate,
    serviceStartDate: defaults.serviceStartDate,
    serviceEndDate: "",
    paymentDueDate: defaults.paymentDueDate,
    providerSignatureDate: "",
    clientSignatureDate: "",
    caregiverName: "",
    caregiverAddress: "",
    caregiverEducation: "",
    governmentIdProof: "",
    certificationStatus: "Pending",
    policeVerification: "Pending",
    registrationMode: defaults.registrationMode,
  };
}
