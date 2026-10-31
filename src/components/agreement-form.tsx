"use client";

import { ChevronDown, Info, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import {
  AGREEMENT_TERMS,
  COMPANY,
  PAYMENT_METHODS,
  REGISTRATION_MODES,
  SCOPE_GROUPS,
  SCOPE_ITEMS,
  billingPeriod,
  calculateFees,
  type AgreementData,
} from "@/lib/agreement";

export type FormErrors = Partial<Record<keyof AgreementData, string>>;

type Props = {
  data: AgreementData;
  onChange: (data: AgreementData) => void;
  errors: FormErrors;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="form-section" open>
      <summary>
        {title}
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="section-fields">{children}</div>
    </details>
  );
}

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export function AgreementForm({ data, onChange, errors }: Props) {
  const set = <K extends keyof AgreementData>(
    name: K,
    value: AgreementData[K],
  ) => onChange({ ...data, [name]: value });

  const field = (
    name: keyof AgreementData,
    label: string,
    options: {
      type?: "text" | "email" | "tel" | "date" | "number";
      placeholder?: string;
      help?: string;
      min?: number;
      max?: number;
      required?: boolean;
      wide?: boolean;
      list?: string;
    } = {},
  ) => (
    <div className={`field ${options.wide ? "span-two" : ""}`} key={name}>
      <label htmlFor={name}>
        {label}
        {options.required && <span className="required"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={options.type ?? "text"}
        value={String(data[name])}
        placeholder={options.placeholder}
        list={options.list}
        min={options.min ?? (options.type === "number" ? 0 : undefined)}
        max={options.max}
        step={options.type === "number" ? "0.01" : undefined}
        aria-required={options.required || undefined}
        aria-invalid={!!errors[name]}
        aria-describedby={
          errors[name]
            ? `${name}-error`
            : options.help
              ? `${name}-help`
              : undefined
        }
        onChange={(event) =>
          set(
            name,
            (options.type === "number"
              ? event.target.value === ""
                ? 0
                : Number(event.target.value)
              : event.target.value) as never,
          )
        }
      />
      {options.help && (
        <p className="field-help" id={`${name}-help`}>
          {options.help}
        </p>
      )}
      {errors[name] && (
        <p className="field-error" id={`${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  const select = (
    name: keyof AgreementData,
    label: string,
    values: readonly string[],
    labels?: readonly string[],
    wide = false,
  ) => (
    <div className={`field ${wide ? "span-two" : ""}`} key={name}>
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        value={String(data[name])}
        onChange={(event) => set(name, event.target.value as never)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      >
        {values.map((value, index) => (
          <option value={value} key={value}>
            {labels?.[index] ?? value}
          </option>
        ))}
      </select>
      {errors[name] && (
        <p className="field-error" id={`${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  const textarea = (
    name: keyof AgreementData,
    label: string,
    options: { help?: string; required?: boolean; placeholder?: string } = {},
  ) => (
    <div className="field span-two" key={name}>
      <label htmlFor={name}>
        {label}
        {options.required && <span className="required"> *</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={String(data[name])}
        rows={3}
        placeholder={options.placeholder}
        onChange={(event) => set(name, event.target.value as never)}
        aria-required={options.required || undefined}
        aria-invalid={!!errors[name]}
        aria-describedby={
          errors[name]
            ? `${name}-error`
            : options.help
              ? `${name}-help`
              : undefined
        }
      />
      {options.help && (
        <p className="field-help" id={`${name}-help`}>
          {options.help}
        </p>
      )}
      {errors[name] && (
        <p className="field-error" id={`${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  const fees = calculateFees(data);
  const togglePayment = (method: AgreementData["paymentMethods"][number]) =>
    set(
      "paymentMethods",
      data.paymentMethods.includes(method)
        ? data.paymentMethods.filter((item) => item !== method)
        : [...data.paymentMethods, method],
    );
  const toggleScope = (id: string) =>
    set(
      "selectedScopeIds",
      data.selectedScopeIds.includes(id)
        ? data.selectedScopeIds.filter((item) => item !== id)
        : [...data.selectedScopeIds, id],
    );

  return (
    <form
      className="agreement-form"
      onSubmit={(event) => event.preventDefault()}
      noValidate
    >
      <Section title="General information">
        <div className="fields-grid">
          {field("agreementDate", "Agreement date", {
            type: "date",
            required: true,
            wide: true,
          })}
        </div>
      </Section>

      <Section title="Company information">
        <div className="company-card">
          <LockKeyhole size={16} aria-hidden="true" />
          <div>
            <strong>{COMPANY.brandName}</strong>
            <p>{COMPANY.legalName}</p>
            <p>
              CIN: {COMPANY.cin}
              <br />
              PAN: {COMPANY.pan}
            </p>
            <p>Registered office: {COMPANY.registeredOffice}</p>
            <p>
              {COMPANY.email}
              <br />
              {COMPANY.phone}
            </p>
            <span>Company identity is fixed for every agreement.</span>
          </div>
        </div>
      </Section>

      <Section title="Client information">
        <div className="fields-grid">
          {select(
            "clientSalutation",
            "Salutation",
            ["", "Mr.", "Mrs.", "Ms.", "Mx.", "Dr."],
            ["None", "Mr.", "Mrs.", "Ms.", "Mx.", "Dr."],
          )}
          {field("clientName", "Client full name", {
            placeholder: "Enter the client's full name",
            required: true,
          })}
          {textarea("clientAddress", "Client address", {
            required: true,
            placeholder: "House / flat, street, city, state and PIN code",
          })}
          {field("clientPhone", "Phone number", {
            type: "tel",
            placeholder: "Optional",
          })}
          {field("clientEmail", "Email address", {
            type: "email",
            placeholder: "Optional",
          })}
          {field("patientName", "Patient / care recipient", {
            wide: true,
            help: "Optional. Enter a name when the client is arranging care for someone else.",
          })}
          {field("clientRelationship", "Client's relationship to patient", {
            wide: true,
            placeholder: "e.g. Daughter, spouse or guardian",
            help: "Optional. Included only when entered.",
          })}
        </div>
      </Section>

      <Section title="Service details">
        <div className="fields-grid">
          {field("serviceType", "Service type", {
            required: true,
            list: "service-types",
            placeholder: "e.g. Caregiving, nursing or baby care",
          })}
          {field("caregiverRole", "Care professional's role", {
            required: true,
            list: "caregiver-roles",
            placeholder: "e.g. Caregiver or nurse",
          })}
          {textarea("serviceDescription", "Service description", {
            required: true,
            help: "Describe the agreed service. The same description appears in the agreement and caregiver scope.",
          })}
          {field("serviceStartDate", "Service start date", {
            type: "date",
            required: true,
          })}
          {field("serviceEndDate", "Service end date", {
            type: "date",
            help: "Optional for ongoing services.",
          })}
          {field("hoursPerDay", "Service hours per day", {
            type: "number",
            required: true,
            min: 0,
            max: 24,
            wide: true,
          })}
          {textarea("serviceAddress", "Service location / address", {
            help: "Optional. Leave blank to use the client's address.",
          })}
        </div>
        <datalist id="service-types">
          <option value="Caregiving" />
          <option value="Nursing care" />
          <option value="Baby care" />
          <option value="Elder care" />
          <option value="Patient care" />
        </datalist>
        <datalist id="caregiver-roles">
          <option value="Caregiver" />
          <option value="Nurse" />
          <option value="Attendant" />
          <option value="Baby care professional" />
        </datalist>
      </Section>

      <Section title="Fees & payment">
        <p className="section-help">
          Enter the agreed service fee per billing cycle and choose how the
          one-time registration fee is charged.
        </p>
        <div className="fields-grid">
          {field("serviceFee", "Service fee (₹)", { type: "number" })}
          {select("billingCycle", "Billing cycle", [
            "Monthly",
            "Weekly",
            "Daily",
          ])}
          {field("registrationFee", "Lifetime registration fee (₹)", {
            type: "number",
            wide: true,
          })}
          {select(
            "registrationMode",
            "Registration fee treatment",
            REGISTRATION_MODES.map((mode) => mode.value),
            REGISTRATION_MODES.map((mode) => mode.label),
            true,
          )}
          {field("paymentDueDate", "First payment due date", {
            type: "date",
            required: true,
            wide: true,
            help: "Payment is due in advance, on or before the service start date.",
          })}
        </div>
        <div className="salary-summary" aria-label="Payment calculation">
          <div>
            <span>First cycle service amount</span>
            <strong>{money(fees.firstCycleServiceFee)}</strong>
          </div>
          <div>
            <span>One-time registration due</span>
            <strong>{money(fees.registrationDue)}</strong>
          </div>
          <div className="salary-total">
            <span>First payment total</span>
            <strong>{money(fees.firstPaymentTotal)}</strong>
          </div>
        </div>
        <div className="calculated-line">
          <span>
            Subsequent service fee / {billingPeriod(data.billingCycle)}
          </span>
          <strong>{money(fees.recurringFee)}</strong>
        </div>
        <p className="field-help info-line">
          <Info size={14} aria-hidden="true" />
          {data.registrationMode === "included"
            ? "Registration is part of the first bill, reducing only its service portion. Later cycles use the full service fee."
            : data.registrationMode === "additional"
              ? "Registration is added once to the first bill. Later cycles contain only the service fee."
              : data.registrationMode === "already-paid"
                ? "Registration has already been paid. It will not be charged again."
                : "Registration is waived. No registration fee is charged."}
        </p>
        <fieldset
          className="choice-list"
          id="paymentMethods"
          tabIndex={-1}
          aria-describedby={
            errors.paymentMethods ? "paymentMethods-error" : undefined
          }
          aria-invalid={!!errors.paymentMethods}
        >
          <legend className="form-subheading">
            Accepted payment methods *
          </legend>
          {PAYMENT_METHODS.map((method) => (
            <label className="choice-row" key={method}>
              <input
                className="choice-checkbox"
                type="checkbox"
                checked={data.paymentMethods.includes(method)}
                onChange={() => togglePayment(method)}
              />
              <span>{method}</span>
            </label>
          ))}
          {errors.paymentMethods && (
            <p className="field-error" id="paymentMethods-error">
              {errors.paymentMethods}
            </p>
          )}
        </fieldset>
      </Section>

      <Section title="Caregiver details & validation">
        <div className="fields-grid">
          {field("caregiverName", "Caregiver full name", {
            required: true,
            wide: true,
            placeholder: "Enter the assigned caregiver's full name",
          })}
          {textarea("caregiverAddress", "Caregiver address", {
            required: true,
          })}
          {field("caregiverEducation", "Education / qualification", {
            wide: true,
            placeholder: "e.g. ANM, GNM or relevant training",
          })}
          {select("certificationStatus", "Certified", [
            "Yes",
            "No",
            "Pending",
            "Not applicable",
          ])}
          {select("policeVerification", "Police verification", [
            "Done",
            "Pending",
            "Not provided",
            "Not applicable",
          ])}
          {field("governmentIdProof", "Government ID proof", {
            wide: true,
            placeholder: "e.g. Aadhaar card & PAN",
            help: "Describe the document types provided. This field is optional.",
          })}
        </div>
      </Section>

      <Section title="Scope of work">
        <p className="section-help">
          Choose the duties agreed for this service. Only selected duties appear
          in the PDF.
        </p>
        <div className="scope-toolbar">
          <span className="field-help">
            {data.selectedScopeIds.length} of {SCOPE_ITEMS.length} duties
            selected
          </span>
          <div>
            <button
              className="button button-outline button-small"
              type="button"
              disabled={data.selectedScopeIds.length === SCOPE_ITEMS.length}
              onClick={() =>
                set(
                  "selectedScopeIds",
                  SCOPE_ITEMS.map((item) => item.id),
                )
              }
            >
              Select all
            </button>
            <button
              className="button button-outline button-small"
              type="button"
              disabled={!data.selectedScopeIds.length}
              onClick={() => set("selectedScopeIds", [])}
            >
              Clear all
            </button>
          </div>
        </div>
        <div
          id="selectedScopeIds"
          tabIndex={-1}
          aria-label="Selected service duties"
          aria-describedby={
            errors.selectedScopeIds ? "selectedScopeIds-error" : undefined
          }
          aria-invalid={!!errors.selectedScopeIds}
        >
          {SCOPE_GROUPS.map((group) => (
            <fieldset className="scope-group" key={group.id}>
              <legend className="scope-heading">{group.title}</legend>
              <div className="choice-list">
                {group.items.map((item, index) => {
                  const id = `${group.id}-${index + 1}`;
                  return (
                    <label className="choice-row" key={id}>
                      <input
                        className="choice-checkbox"
                        type="checkbox"
                        checked={data.selectedScopeIds.includes(id)}
                        onChange={() => toggleScope(id)}
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {errors.selectedScopeIds && (
            <p className="field-error" id="selectedScopeIds-error">
              {errors.selectedScopeIds}
            </p>
          )}
        </div>
        <div className="fields-grid">
          {textarea("additionalScope", "Additional duties", {
            placeholder: "Enter one additional duty per line",
            help: "Optional. These duties appear after the selected scope items.",
          })}
        </div>
      </Section>

      <Section title="Authorized signatory & signatures">
        <div className="fields-grid">
          {field("signerName", "Company signatory name", {
            required: true,
            wide: true,
          })}
          {field("signerTitle", "Signatory designation", {
            required: true,
            wide: true,
          })}
          {field("providerSignatureDate", "Company signature date", {
            type: "date",
            help: "Optional. Leave blank to fill in when signing.",
          })}
          {field("clientSignatureDate", "Client signature date", {
            type: "date",
            help: "Optional. Leave blank to fill in when signing.",
          })}
        </div>
        <p className="field-help">
          The PDF includes blank signature lines for both parties.
        </p>
      </Section>

      <Section title="Standard agreement terms">
        <div className="standard-terms">
          <p>
            Client cancellation at least {AGREEMENT_TERMS.cancellationHours}{" "}
            hours before service: {AGREEMENT_TERMS.earlyRefundPercent}% refund.
            Later cancellation: {AGREEMENT_TERMS.lateRefundPercent}% refund.
          </p>
          <p>
            CarePal cancellation: {AGREEMENT_TERMS.providerRefundPercent}%
            refund or a replacement at no extra cost, according to the client's
            preference.
          </p>
          <p>
            Written refund requests: within {AGREEMENT_TERMS.refundRequestDays}{" "}
            days. Processing: {AGREEMENT_TERMS.refundProcessingMinDays}–
            {AGREEMENT_TERMS.refundProcessingMaxDays} business days after
            approval.
          </p>
          <p>
            Termination notice: {AGREEMENT_TERMS.terminationNoticeDays} days.
            Arbitration venue: {AGREEMENT_TERMS.arbitrationCity}. Governing law:
            India.
          </p>
        </div>
      </Section>
    </form>
  );
}
