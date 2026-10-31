import { agreementDraftSchema, type AgreementData } from "./agreement";

export const DRAFT_KEY = "carepal-agreement:draft:v1";

export function readDraft(): AgreementData | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  return raw ? agreementDraftSchema.parse(JSON.parse(raw)) : null;
}

export function saveDraft(data: AgreementData): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export function agreementFilename(data: AgreementData): string {
  const name =
    data.clientName
      .trim()
      .replace(/[^\p{L}\p{M}\p{N} -]/gu, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "Client";
  return `CarePal-Service-Agreement-${name}-${data.agreementDate || "draft"}.pdf`;
}
