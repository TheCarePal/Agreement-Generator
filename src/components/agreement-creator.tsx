"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  AlertTriangle,
  Check,
  Download,
  FilePlus2,
  FileText,
  History,
  LoaderCircle,
  Pencil,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  agreementSchema,
  createAgreementDefaults,
  type AgreementData,
} from "@/lib/agreement";
import {
  agreementFilename,
  readDraft,
  saveDraft,
} from "@/lib/agreement-storage";
import { getPublicAssetPath } from "@/lib/public-path";
import { AgreementDocument } from "./agreement-document";
import { useDocumentHistory } from "./document-history";
import { createAgreementDraftFromArchive } from "@/lib/archive-draft";
import { AgreementForm, type FormErrors } from "./agreement-form";
import PdfPreview from "./pdf-preview";

type GeneratedPdf = { key: string; blob: Blob; url: string };

export default function AgreementCreator() {
  const [data, setData] = useState<AgreementData | null>(null);
  const [saved, setSaved] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [generated, setGenerated] = useState<GeneratedPdf | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [newDialog, setNewDialog] = useState(false);
  const [mobileTab, setMobileTab] = useState("edit");
  const latestRequest = useRef<{ data: AgreementData; key: string } | null>(
    null,
  );
  const rendering = useRef(false);
  const active = useRef(true);
  const previousUrl = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const storageWarning = useRef(false);

  useEffect(() => {
    active.current = true;
    try {
      setData(readDraft() ?? createAgreementDefaults());
    } catch {
      setData(createAgreementDefaults());
      toast.error(
        "Your saved draft couldn’t be read. A new agreement is ready.",
      );
    }
    return () => {
      active.current = false;
      if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);
    };
  }, []);

  const key = data ? JSON.stringify(data) : "";
  const ready = !!generated && generated.key === key;
  const pending = !!data && !ready && !pdfError;

  useEffect(() => {
    if (!data) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      try {
        saveDraft(data);
        setSaved(true);
        setStorageUnavailable(false);
      } catch {
        setStorageUnavailable(true);
        if (!storageWarning.current) {
          toast.error(
            "Browser storage is unavailable. Keep this page open and download your PDF to save the agreement.",
          );
          storageWarning.current = true;
        }
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  // Serialize PDF work and discard superseded renders, so actions always use the current draft.
  const renderPending = useCallback(async () => {
    if (rendering.current) return;
    rendering.current = true;
    try {
      while (latestRequest.current && active.current) {
        const request = latestRequest.current;
        latestRequest.current = null;
        try {
          const blob = await pdf(
            <AgreementDocument data={request.data} />,
          ).toBlob();
          if (!active.current || latestRequest.current) continue;
          const url = URL.createObjectURL(blob);
          const oldUrl = previousUrl.current;
          previousUrl.current = url;
          setGenerated({ key: request.key, blob, url });
          setPdfError(null);
          if (oldUrl)
            window.setTimeout(() => URL.revokeObjectURL(oldUrl), 2000);
        } catch {
          if (active.current && !latestRequest.current)
            setPdfError(
              "Please try again. If this continues, check your agreement details or refresh the page.",
            );
        }
      }
    } finally {
      rendering.current = false;
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    setPdfError(null);
    latestRequest.current = { data, key };
    const timer = window.setTimeout(() => {
      void renderPending();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, key, renderPending, revision]);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    if (newDialog && !element.open) element.showModal();
    if (!newDialog && element.open) element.close();
  }, [newDialog]);

  const changeData = (next: AgreementData) => {
    setData(next);
    setErrors({});
  };

  const history = useDocumentHistory({
    kind: "agreements",
    schema: agreementSchema,
    onLoad: (snapshot: unknown) => {
      changeData(agreementSchema.parse(snapshot));
      setMobileTab("edit");
    },
    onReuse: (snapshot: unknown) => {
      changeData(createAgreementDraftFromArchive(snapshot));
      setMobileTab("edit");
    },
  });

  const download = async () => {
    if (!data || !ready || !generated || history.busy) return;
    const parsed = agreementSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: FormErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof AgreementData;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      setMobileTab("edit");
      toast.error(
        "Please complete the highlighted agreement details before downloading.",
      );
      window.setTimeout(() => {
        const input = document.getElementById(Object.keys(fieldErrors)[0]);
        const section = input?.closest("details");
        if (section) section.open = true;
        input?.focus();
        input?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);
      return;
    }
    const snapshot = JSON.parse(JSON.stringify(data)) as AgreementData;
    const filename = agreementFilename(snapshot);
    try {
      const result = await history.archiveDownload({
        blob: generated.blob,
        snapshot,
        filename,
        label: snapshot.clientName,
        subtitle: snapshot.serviceType,
        documentDate: snapshot.agreementDate,
      });
      if (result.status !== "saved") return;
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("Agreement saved to shared history and PDF downloaded.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The agreement could not be saved. Check your connection and retry.",
      );
    }
  };

  const newAgreement = () => {
    changeData(createAgreementDefaults());
    setNewDialog(false);
    setMobileTab("edit");
    toast.success(
      "New agreement ready. Enter the client and caregiver details.",
    );
  };

  if (!data)
    return (
      <main className="loading-app">
        <LoaderCircle className="spin" size={25} />
        Loading CarePal Agreement Generator…
      </main>
    );

  return (
    <>
      <main className="app-shell">
        <header className="app-header">
          <div className="brand">
            <img
              src={getPublicAssetPath("/carepal-logo.png")}
              alt="CarePal logo"
              width={36}
              height={36}
            />
            <div>
              <h1>CarePal Agreement Generator</h1>
              <p>Carepalz Internet Private Limited</p>
            </div>
          </div>
          <div className="header-actions">
            {history.sessionActions}
            <button
              className="button button-outline button-small"
              type="button"
              onClick={history.openHistory}
              disabled={history.busy}
            >
              <History size={16} />
              Previous agreements
            </button>
            <button
              className="button button-outline button-small"
              type="button"
              onClick={() => setNewDialog(true)}
              disabled={history.busy}
            >
              <FilePlus2 size={16} />
              New agreement
            </button>
            <button
              className="button button-primary download-desktop"
              type="button"
              onClick={download}
              disabled={!ready || history.busy}
            >
              {pending || history.archiveBusy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Download size={17} />
              )}
              {history.archiveBusy
                ? "Saving PDF…"
                : pending
                  ? "Generating PDF…"
                  : "Save & download PDF"}
            </button>
          </div>
        </header>

        <div
          className="mobile-tabs"
          role="tablist"
          aria-label="Agreement workspace"
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "edit"
                  : event.key === "End"
                    ? "preview"
                    : mobileTab === "edit"
                      ? "preview"
                      : "edit";
              setMobileTab(next);
              document.getElementById(`${next}-tab`)?.focus();
            }
          }}
        >
          <button
            id="edit-tab"
            type="button"
            role="tab"
            aria-selected={mobileTab === "edit"}
            aria-controls="agreement-edit"
            tabIndex={mobileTab === "edit" ? 0 : -1}
            className={mobileTab === "edit" ? "selected" : ""}
            onClick={() => setMobileTab("edit")}
          >
            <Pencil size={16} />
            Edit agreement
          </button>
          <button
            id="preview-tab"
            type="button"
            role="tab"
            aria-selected={mobileTab === "preview"}
            aria-controls="agreement-preview"
            tabIndex={mobileTab === "preview" ? 0 : -1}
            className={mobileTab === "preview" ? "selected" : ""}
            onClick={() => setMobileTab("preview")}
          >
            <FileText size={16} />
            Preview PDF
          </button>
        </div>

        <div className={`workspace mobile-${mobileTab}`}>
          <div
            className="form-panel"
            id="agreement-edit"
            role="region"
            aria-label="Edit agreement"
          >
            <fieldset className="form-lock" disabled={history.archiveBusy}>
              <AgreementForm
                data={data}
                onChange={changeData}
                errors={errors}
              />
            </fieldset>
          </div>
          <div
            className="preview-panel"
            id="agreement-preview"
            role="region"
            aria-label="Preview PDF"
          >
            <PdfPreview
              url={generated?.url ?? null}
              pending={pending}
              error={pdfError}
              filename={agreementFilename(data)}
              onRetry={() => setRevision((value) => value + 1)}
            />
          </div>
        </div>

        <footer className="app-footer">
          <span className="save-status" role="status">
            {storageUnavailable ? (
              <AlertTriangle size={14} />
            ) : saved ? (
              <Check size={14} />
            ) : (
              <LoaderCircle size={13} className="spin" />
            )}
            {storageUnavailable
              ? "Draft not saved · download to keep a copy"
              : saved
                ? "Draft saved in this browser"
                : "Saving draft…"}
          </span>
          <span>English · INR · A4 PDF</span>
        </footer>
        <div className="mobile-download">
          <button
            className="button button-primary"
            type="button"
            onClick={download}
            disabled={!ready || history.busy}
          >
            {pending || history.archiveBusy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Download size={17} />
            )}
            {history.archiveBusy
              ? "Saving PDF…"
              : pending
                ? "Generating PDF…"
                : "Save & download PDF"}
          </button>
        </div>
      </main>

      {history.dialogs}
      <dialog
        ref={dialogRef}
        className="modal"
        onCancel={() => setNewDialog(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setNewDialog(false);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="modal-header">
          <h2 id="dialog-title">Create a new agreement?</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Close dialog"
            onClick={() => setNewDialog(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="modal-description">
          This replaces the current draft with blank client and caregiver
          details and the default CarePal terms. Save the current agreement
          first to keep it in shared history.
        </p>
        <div className="confirmation-actions">
          <button
            className="button button-outline"
            type="button"
            onClick={() => setNewDialog(false)}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={newAgreement}
          >
            <FilePlus2 size={16} />
            Create new agreement
          </button>
        </div>
      </dialog>
      <Toaster richColors closeButton position="bottom-right" />
    </>
  );
}
