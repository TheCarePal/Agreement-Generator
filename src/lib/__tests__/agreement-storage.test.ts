import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgreementDefaults } from "../agreement";
import { DRAFT_KEY, agreementFilename, readDraft, saveDraft } from "../agreement-storage";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("agreement draft storage", () => {
  it("starts without a saved draft", () => {
    expect(readDraft()).toBeNull();
  });

  it("restores the saved agreement independently of later object edits", () => {
    const data = { ...createAgreementDefaults(), clientName: "Priya Sharma", serviceFee: 14000.5 };
    saveDraft(data);
    data.clientName = "Another client";
    data.selectedScopeIds.pop();
    expect(readDraft()).toMatchObject({ clientName: "Priya Sharma", serviceFee: 14000.5 });
    expect(readDraft()?.selectedScopeIds).toHaveLength(createAgreementDefaults().selectedScopeIds.length);
  });

  it("allows the current agreement to be unfinished while saving", () => {
    const data = { ...createAgreementDefaults(), clientName: "", serviceStartDate: "", hoursPerDay: 0 };
    saveDraft(data);
    expect(readDraft()).toEqual(data);
  });

  it("reports malformed JSON and invalid draft structure to the caller", () => {
    store.set(DRAFT_KEY, "{broken");
    expect(() => readDraft()).toThrow();
    store.set(DRAFT_KEY, JSON.stringify({ clientName: "Missing fields" }));
    expect(() => readDraft()).toThrow();
    store.set(DRAFT_KEY, JSON.stringify({ ...createAgreementDefaults(), serviceFee: "23000" }));
    expect(() => readDraft()).toThrow();
  });

  it("reports blocked browser storage reads", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new DOMException("Storage blocked", "SecurityError"); } });
    expect(() => readDraft()).toThrow("Storage blocked");
  });

  it("reports blocked or full browser storage writes", () => {
    vi.stubGlobal("localStorage", { setItem: () => { throw new DOMException("Storage full", "QuotaExceededError"); } });
    expect(() => saveDraft(createAgreementDefaults())).toThrow("Storage full");
  });

  it("uses an independent namespace without changing an offer letter draft", () => {
    const offerDraft = JSON.stringify({ employeeName: "Existing offer employee" });
    store.set("carepal-offer:draft:v1", offerDraft);
    saveDraft(createAgreementDefaults());
    expect(DRAFT_KEY).toBe("carepal-agreement:draft:v1");
    expect(store.get("carepal-offer:draft:v1")).toBe(offerDraft);
    expect(store.has(DRAFT_KEY)).toBe(true);
  });
});

describe("agreement PDF filenames", () => {
  it("includes the client and agreement date while stripping unsafe punctuation", () => {
    expect(agreementFilename({ ...createAgreementDefaults(), clientName: "  Priya / Sharma:*?  ", agreementDate: "2026-10-31" }))
      .toBe("CarePal-Service-Agreement-Priya-Sharma-2026-10-31.pdf");
  });

  it("preserves Indian-script combining marks in client names", () => {
    expect(agreementFilename({ ...createAgreementDefaults(), clientName: "अनु", agreementDate: "2026-10-31" }))
      .toBe("CarePal-Service-Agreement-अनु-2026-10-31.pdf");
  });

  it("has a safe fallback for unnamed drafts", () => {
    expect(agreementFilename({ ...createAgreementDefaults(), clientName: "", agreementDate: "" }))
      .toBe("CarePal-Service-Agreement-Client-draft.pdf");
  });

  it("bounds the client-name portion of the filename", () => {
    const name = "A".repeat(150);
    expect(agreementFilename({ ...createAgreementDefaults(), clientName: name, agreementDate: "2026-10-31" }))
      .toBe(`CarePal-Service-Agreement-${"A".repeat(80)}-2026-10-31.pdf`);
  });
});
