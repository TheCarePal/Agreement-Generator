// @vitest-environment happy-dom

import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgreementDefaults, type AgreementData } from "@/lib/agreement";
import { DRAFT_KEY } from "@/lib/agreement-storage";

const mocked = vi.hoisted(() => ({
  pdf: vi.fn(),
  archiveDownload: vi.fn(),
  openHistory: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
let historyState = { busy: false, archiveBusy: false };
let historyOptions: {
  onLoad: (snapshot: unknown) => void;
  onReuse: (snapshot: unknown) => void;
};

vi.mock("@react-pdf/renderer", () => ({ pdf: mocked.pdf }));
vi.mock("../agreement-document", () => ({ AgreementDocument: () => null }));
vi.mock("../agreement-form", () => ({
  AgreementForm: ({
    data,
    onChange,
  }: {
    data: AgreementData;
    onChange: (data: AgreementData) => void;
  }) => (
    <label>
      Client name
      <input
        id="clientName"
        aria-label="Client name"
        value={data.clientName}
        onChange={(event) =>
          onChange({ ...data, clientName: event.target.value })
        }
      />
    </label>
  ),
}));
vi.mock("../pdf-preview", () => ({
  default: ({ pending }: { pending: boolean }) => (
    <div data-testid="pdf-preview" data-pending={String(pending)} />
  ),
}));
vi.mock("../document-history", () => ({
  useDocumentHistory: (options: typeof historyOptions) => {
    historyOptions = options;
    return {
      ...historyState,
      archiveDownload: mocked.archiveDownload,
      openHistory: mocked.openHistory,
      sessionActions: null,
      dialogs: null,
    };
  },
}));
vi.mock("sonner", () => ({
  Toaster: () => null,
  toast: { success: mocked.success, error: mocked.error },
}));

import AgreementCreator from "../agreement-creator";

let draft: AgreementData;
let generatedBlob: Blob;
let verifiedBlob: Blob;
let downloadClick: ReturnType<typeof vi.spyOn>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function finishRender() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(550);
  });
}
const saveButton = () =>
  screen.getAllByRole("button", {
    name: "Save & download PDF",
  })[0] as HTMLButtonElement;
async function clickSave() {
  await act(async () => {
    fireEvent.click(saveButton());
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  historyState = { busy: false, archiveBusy: false };
  draft = {
    ...createAgreementDefaults(),
    clientName: "Priya Sharma",
    clientAddress: "12 Test Road, New Delhi",
    caregiverName: "Assigned Caregiver",
    caregiverAddress: "24 Test Road, New Delhi",
    signerName: "CarePal Signatory",
    agreementDate: "2026-11-01",
    serviceStartDate: "2026-11-09",
    paymentDueDate: "2026-11-08",
  };
  localStorage.clear();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  generatedBlob = new Blob(["%PDF-rendered-agreement"], {
    type: "application/pdf",
  });
  verifiedBlob = new Blob(["%PDF-verified-stored-agreement"], {
    type: "application/pdf",
  });
  mocked.pdf.mockImplementation(() => ({
    toBlob: () => Promise.resolve(generatedBlob),
  }));
  mocked.archiveDownload.mockResolvedValue({
    status: "saved",
    blob: verifiedBlob,
    record: { id: "stored" },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test-pdf"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value() {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value() {
      this.open = false;
    },
  });
  downloadClick = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("agreement creator shared archive integration", () => {
  it("archives the current rendered bytes with an independent matching snapshot and downloads the verified stored PDF", async () => {
    render(<AgreementCreator />);
    await finishRender();
    expect(saveButton().disabled).toBe(false);
    await clickSave();
    const input = mocked.archiveDownload.mock.calls[0][0];
    expect(input).toMatchObject({
      blob: generatedBlob,
      snapshot: draft,
      label: draft.clientName,
      subtitle: draft.serviceType,
      documentDate: draft.agreementDate,
    });
    expect(input.snapshot).not.toBe(draft);
    expect(mocked.pdf.mock.calls[0][0].props.data).toEqual(input.snapshot);
    expect(URL.createObjectURL).toHaveBeenLastCalledWith(verifiedBlob);
    expect(downloadClick).toHaveBeenCalledTimes(1);
    expect(mocked.success).toHaveBeenCalledWith(
      "Agreement saved to shared history and PDF downloaded.",
    );
  });

  it("retains the exact untrimmed form snapshot used by the PDF renderer", async () => {
    draft = { ...draft, clientName: "  Priya Sharma  " };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    render(<AgreementCreator />);
    await finishRender();
    await clickSave();
    const input = mocked.archiveDownload.mock.calls[0][0];
    expect(input.snapshot.clientName).toBe("  Priya Sharma  ");
    expect(mocked.pdf.mock.calls[0][0].props.data).toEqual(input.snapshot);
    expect(downloadClick).toHaveBeenCalledTimes(1);
  });

  it("rejects an unfinished draft before invoking shared storage or a download", async () => {
    draft = { ...draft, clientName: "" };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    render(<AgreementCreator />);
    await finishRender();
    await clickSave();
    expect(mocked.archiveDownload).not.toHaveBeenCalled();
    expect(downloadClick).not.toHaveBeenCalled();
    expect(mocked.error).toHaveBeenCalledWith(
      "Please complete the highlighted agreement details before downloading.",
    );
    expect(mocked.success).not.toHaveBeenCalled();
  });

  it("does not download or claim a save when staff sign-in is required", async () => {
    mocked.archiveDownload.mockResolvedValue({ status: "sign-in-required" });
    render(<AgreementCreator />);
    await finishRender();
    await clickSave();
    expect(mocked.archiveDownload).toHaveBeenCalledTimes(1);
    expect(downloadClick).not.toHaveBeenCalled();
    expect(mocked.success).not.toHaveBeenCalled();
  });

  it("reports an archive failure without downloading or claiming success", async () => {
    mocked.archiveDownload.mockRejectedValue(
      new Error("Storage upload failed. Retry safely."),
    );
    render(<AgreementCreator />);
    await finishRender();
    await clickSave();
    expect(mocked.error).toHaveBeenCalledWith(
      "Storage upload failed. Retry safely.",
    );
    expect(downloadClick).not.toHaveBeenCalled();
    expect(mocked.success).not.toHaveBeenCalled();
  });

  it("keeps stale PDF bytes unavailable while a client edit is rendering", async () => {
    render(<AgreementCreator />);
    await finishRender();
    const nextPdf = deferred<Blob>();
    const nextBlob = new Blob(["%PDF-new-client"], { type: "application/pdf" });
    mocked.pdf.mockImplementationOnce(() => ({
      toBlob: () => nextPdf.promise,
    }));
    fireEvent.change(screen.getByLabelText("Client name"), {
      target: { value: "New Client" },
    });
    expect(
      screen
        .getAllByRole("button", { name: "Generating PDF…" })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    await finishRender();
    expect(mocked.archiveDownload).not.toHaveBeenCalled();
    await act(async () => {
      nextPdf.resolve(nextBlob);
      await nextPdf.promise;
    });
    await clickSave();
    expect(mocked.archiveDownload.mock.calls[0][0]).toMatchObject({
      blob: nextBlob,
      snapshot: { clientName: "New Client" },
      label: "New Client",
    });
    expect(mocked.pdf.mock.calls[1][0].props.data.clientName).toBe(
      "New Client",
    );
  });

  it("locks editing and new-document actions while shared storage is saving", async () => {
    historyState = { busy: true, archiveBusy: true };
    render(<AgreementCreator />);
    await finishRender();
    expect(
      (
        screen
          .getByLabelText("Client name")
          .closest("fieldset") as HTMLFieldSetElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "New agreement",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Previous agreements",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      screen
        .getAllByRole("button", { name: "Saving PDF…" })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    expect(mocked.archiveDownload).not.toHaveBeenCalled();
  });

  it("loads saved fields but clears personal details when archived terms are reused", async () => {
    render(<AgreementCreator />);
    await finishRender();
    const archived = {
      ...draft,
      clientName: "Archived Client",
      serviceFee: 7000,
    };
    act(() => historyOptions.onLoad(archived));
    expect(
      (screen.getByLabelText("Client name") as HTMLInputElement).value,
    ).toBe("Archived Client");
    act(() => historyOptions.onReuse(archived));
    expect(
      (screen.getByLabelText("Client name") as HTMLInputElement).value,
    ).toBe("");
    await finishRender();
    expect(mocked.pdf.mock.calls.at(-1)?.[0].props.data.serviceFee).toBe(7000);
    expect(mocked.archiveDownload).not.toHaveBeenCalled();
  });
});
