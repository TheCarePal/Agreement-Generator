import React, { type ReactNode } from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  AGREEMENT_TERMS,
  COMPANY,
  billingPeriod,
  calculateFees,
  formatDate,
  formatMoney,
  getSelectedScope,
  type AgreementData,
} from "@/lib/agreement";
import { getPublicAssetPath } from "@/lib/public-path";

const CYAN = "#00a7c4";
const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10.3,
    lineHeight: 1.19,
    color: "#151515",
    paddingTop: 30,
    paddingBottom: 54,
    paddingHorizontal: 44,
  },
  letterhead: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 7,
    marginBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  logoColumn: { width: 87, alignItems: "center" },
  logo: { width: 54, height: 54, objectFit: "contain" },
  tagline: { fontSize: 7.6, color: CYAN, marginTop: 3, letterSpacing: 1.3 },
  identity: { flex: 1, textAlign: "center", color: CYAN },
  legalName: { fontFamily: "Times-Bold", fontSize: 13.2, marginBottom: 5 },
  registration: { fontFamily: "Times-Bold", fontSize: 10.6, marginBottom: 3 },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 11,
  },
  continuationTitle: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  paragraph: { marginBottom: 5, textAlign: "justify" },
  bold: { fontFamily: "Times-Bold" },
  parties: { marginBottom: 5 },
  address: { marginTop: 3 },
  section: { marginTop: 5, marginBottom: 3 },
  sectionHeading: { fontFamily: "Times-Bold", fontSize: 10.7, marginBottom: 5 },
  sectionBody: { paddingLeft: 13 },
  subsectionHeading: {
    fontFamily: "Times-Bold",
    marginBottom: 4,
    marginTop: 4,
  },
  footerTop: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 8.5,
    color: CYAN,
  },
  footerBottom: {
    position: "absolute",
    bottom: 15,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 8.5,
    color: CYAN,
  },
  signatures: {
    marginTop: 21,
    paddingTop: 12,
    borderTopWidth: 0.6,
    borderTopColor: "#888888",
  },
  signatureIntro: { fontFamily: "Times-Bold", marginBottom: 13 },
  signatureColumns: { flexDirection: "row", justifyContent: "space-between" },
  signatureColumn: { width: "47%" },
  signatureHeading: { fontFamily: "Times-Bold", marginBottom: 8 },
  signatureDetail: { marginBottom: 5 },
  signatureLine: {
    height: 36,
    borderBottomWidth: 0.5,
    borderBottomColor: "#444444",
    marginBottom: 6,
  },
  signatureLabel: { fontSize: 8.7, color: "#666666", marginBottom: 11 },
  profile: {
    backgroundColor: "#f2f9fa",
    padding: 10,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#c8e4e8",
  },
  profileRow: { flexDirection: "row", marginBottom: 4 },
  profileLabel: { width: 105, fontFamily: "Times-Bold" },
  profileValue: { flex: 1 },
  scopeIntro: { fontSize: 10, marginBottom: 9, textAlign: "justify" },
  scopeGroup: { marginBottom: 6 },
  scopeHeading: { fontFamily: "Times-Bold", fontSize: 10.2, marginBottom: 4 },
  duty: { flexDirection: "row", marginBottom: 3, paddingLeft: 4 },
  bullet: { width: 12, fontSize: 9.7 },
  dutyText: { flex: 1, fontSize: 9.7, lineHeight: 1.17 },
  additionalDuty: { marginBottom: 4, fontSize: 9.7, textAlign: "justify" },
});

function Bold({ children }: { children: ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function flattenContent(children: ReactNode): ReactNode[] {
  return React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ children?: ReactNode }>(child) &&
    child.type === React.Fragment
      ? flattenContent(child.props.children)
      : [child],
  );
}

/** Keep a heading with its opening paragraph; let longer clauses flow naturally. */
function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  const content = flattenContent(children);
  return (
    <>
      <View style={styles.section} wrap={false}>
        <Text style={styles.sectionHeading}>
          {number}. {title}
        </Text>
        <View style={styles.sectionBody}>{content[0]}</View>
      </View>
      {content.slice(1).map((child, index) => (
        <View key={index} style={styles.sectionBody}>
          {child}
        </View>
      ))}
    </>
  );
}

function Footer() {
  return (
    <>
      <Text style={styles.footerTop} fixed>
        {COMPANY.website} | {COMPANY.email}
      </Text>
      <Text style={styles.footerBottom} fixed>
        {COMPANY.location} | {COMPANY.phone}
      </Text>
    </>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function Duty({ children }: { children: string }) {
  return (
    <View style={styles.duty} wrap={false}>
      <Text style={styles.bullet}>-</Text>
      <Text style={styles.dutyText}>{children}</Text>
    </View>
  );
}

export function AgreementDocument({
  data,
  logoSource = getPublicAssetPath("/carepal-logo.png"),
}: {
  data: AgreementData;
  logoSource?: string;
}) {
  const clientName = data.clientName.trim() || "[Client name]";
  const client = `${data.clientSalutation ? `${data.clientSalutation} ` : ""}${clientName}`;
  const caregiver = data.caregiverName.trim() || "[Caregiver name]";
  const role = data.caregiverRole.trim() || "[Caregiver role]";
  const serviceType = data.serviceType.trim() || "[Service type]";
  const description = data.serviceDescription.trim() || "[Service description]";
  const fees = calculateFees(data);
  const period = billingPeriod(data.billingCycle);
  const selectedScope = getSelectedScope(data);
  const customDuties = data.additionalScope
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const signatureDate = (date: string) =>
    date ? formatDate(date) : "________________________";
  const registrationExplanation = {
    included: `The first payment of ${formatMoney(fees.firstPaymentTotal)} includes ${formatMoney(fees.registrationDue)} as a one-time lifetime registration fee and ${formatMoney(fees.firstCycleServiceFee)} for services. Registration is payable only once and remains valid for future services with The CarePal. Subsequent billing cycles remain ${formatMoney(fees.recurringFee)} per ${period}, without another registration charge.`,
    additional: `A one-time lifetime registration fee of ${formatMoney(fees.registrationDue)} is payable in addition to the service fee. The first payment totals ${formatMoney(fees.firstPaymentTotal)} (${formatMoney(fees.firstCycleServiceFee)} for services plus ${formatMoney(fees.registrationDue)} for registration). Registration is payable only once and remains valid for future services with The CarePal. Subsequent billing cycles are ${formatMoney(fees.recurringFee)} per ${period}.`,
    "already-paid": `The one-time lifetime registration fee of ${formatMoney(data.registrationFee)} has already been paid and will not be charged again. Registration remains valid for future services with The CarePal. The first payment due under this Agreement is ${formatMoney(fees.firstPaymentTotal)}; subsequent billing cycles are ${formatMoney(fees.recurringFee)} per ${period}.`,
    waived: `The one-time registration fee is waived for this Agreement. No registration amount is charged. The first payment due is ${formatMoney(fees.firstPaymentTotal)}; subsequent billing cycles are ${formatMoney(fees.recurringFee)} per ${period}.`,
  }[data.registrationMode];

  return (
    <Document
      title={`Service agreement - ${clientName}`}
      author={COMPANY.legalName}
      subject="Caregiving service agreement and agreed caregiver duties"
      creator="The CarePal Agreement Generator"
      language="en-IN"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.letterhead} wrap={false}>
          <View style={styles.logoColumn}>
            <Image src={logoSource} style={styles.logo} />
            <Text style={styles.tagline}>Peace at home</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.legalName}>
              {COMPANY.legalName.toUpperCase()}
            </Text>
            <Text style={styles.registration}>CIN: {COMPANY.cin}</Text>
            <Text style={styles.registration}>PAN: {COMPANY.pan}</Text>
          </View>
        </View>
        <Text style={styles.title}>SERVICE AGREEMENT</Text>
        <Paragraph>
          This Service Agreement ("Agreement") is entered into on{" "}
          <Bold>{formatDate(data.agreementDate)}</Bold>, by and between:
        </Paragraph>
        <View style={styles.parties}>
          <Paragraph>
            <Bold>{COMPANY.brandName}</Bold> ("Service Provider"), operated by{" "}
            <Bold>{COMPANY.legalName}</Bold>, having its registered office at{" "}
            <Bold>{COMPANY.registeredOffice}</Bold>; and
          </Paragraph>
          <Paragraph>
            <Bold>{client}</Bold> ("Client"), having a home address at{" "}
            <Bold>{data.clientAddress.trim() || "[Client address]"}</Bold>.
          </Paragraph>
          {data.clientPhone.trim() || data.clientEmail.trim() ? (
            <Paragraph>
              {[
                data.clientPhone.trim()
                  ? `Phone: ${data.clientPhone.trim()}`
                  : "",
                data.clientEmail.trim()
                  ? `Email: ${data.clientEmail.trim()}`
                  : "",
              ]
                .filter(Boolean)
                .join(" | ")}
            </Paragraph>
          ) : null}
          {data.patientName.trim() || data.clientRelationship.trim() ? (
            <Paragraph>
              {[
                data.patientName.trim()
                  ? `Person receiving care: ${data.patientName.trim()}`
                  : "",
                data.clientRelationship.trim()
                  ? `Client's relationship: ${data.clientRelationship.trim()}`
                  : "",
              ]
                .filter(Boolean)
                .join(". ")}
              .
            </Paragraph>
          ) : null}
        </View>
        <Paragraph>
          Both parties agree to the following terms and conditions:
        </Paragraph>

        <Section number={1} title="Scope of Services">
          <Paragraph>
            1.1 The CarePal will provide a qualified <Bold>{role}</Bold> to the
            Client for <Bold>{serviceType}</Bold> services. {description}
          </Paragraph>
          <Paragraph>
            1.2 The Client agrees to provide an appropriate and safe work
            environment for the assigned professional. Services are scheduled to
            start on <Bold>{formatDate(data.serviceStartDate)}</Bold>
            {data.serviceEndDate ? (
              <>
                {" "}
                and end on <Bold>{formatDate(data.serviceEndDate)}</Bold>
              </>
            ) : null}
            , for up to <Bold>{data.hoursPerDay} hours per day</Bold>.
            {data.serviceAddress.trim()
              ? ` Service address: ${data.serviceAddress.trim()}.`
              : " Services will be provided at the Client's address stated above."}
          </Paragraph>
        </Section>

        <Section number={2} title="Fees and Payment Terms">
          <Paragraph>
            2.1 The Client agrees to a quoted service fee of{" "}
            <Bold>
              {formatMoney(fees.recurringFee)} per {period}
            </Bold>{" "}
            for {serviceType} services provided by The CarePal.{" "}
            {registrationExplanation}
          </Paragraph>
          <Paragraph>
            2.2 Payment is due in advance according to the agreed{" "}
            <Bold>{data.billingCycle.toLowerCase()}</Bold> billing cycle. The
            first payment is due on{" "}
            <Bold>{formatDate(data.paymentDueDate)}</Bold>.
          </Paragraph>
          <Paragraph>
            2.3 Payments may be made via{" "}
            <Bold>
              {data.paymentMethods.length
                ? data.paymentMethods.join(" / ")
                : "[Payment method]"}
            </Bold>
            . The CarePal will issue an invoice for all services rendered.
          </Paragraph>
        </Section>

        <Section number={3} title="Cancellation Policy">
          <View wrap={false}>
            <Text style={styles.subsectionHeading}>
              3.1 Client-Initiated Cancellation
            </Text>
            <Paragraph>
              If the Client cancels services{" "}
              <Bold>{AGREEMENT_TERMS.cancellationHours} hours or more</Bold>{" "}
              before the scheduled service start,{" "}
              <Bold>{AGREEMENT_TERMS.earlyRefundPercent}%</Bold> of the paid
              amount will be refunded. If cancellation is made less than{" "}
              <Bold>{AGREEMENT_TERMS.cancellationHours} hours</Bold> before the
              service start, <Bold>{AGREEMENT_TERMS.lateRefundPercent}%</Bold>{" "}
              of the paid amount will be refunded.
            </Paragraph>
          </View>
          <View wrap={false}>
            <Text style={styles.subsectionHeading}>
              3.2 The CarePal-Initiated Cancellation
            </Text>
            <Paragraph>
              In the event of cancellation initiated by The CarePal, the Client
              will receive a{" "}
              <Bold>{AGREEMENT_TERMS.providerRefundPercent}% refund</Bold>, or a
              replacement {role} will be provided at no extra cost, based on the
              Client's preference.
            </Paragraph>
          </View>
        </Section>

        <Section number={4} title="Refund Policy">
          <Paragraph>
            4.1 Refund requests must be submitted in writing to{" "}
            <Bold>{COMPANY.email}</Bold> within{" "}
            <Bold>{AGREEMENT_TERMS.refundRequestDays} days</Bold> of the
            cancellation or dispute.
          </Paragraph>
          <Paragraph>
            4.2 Refunds will be processed within{" "}
            <Bold>
              {AGREEMENT_TERMS.refundProcessingMinDays}-
              {AGREEMENT_TERMS.refundProcessingMaxDays} business days
            </Bold>{" "}
            after approval.
          </Paragraph>
          <Paragraph>
            4.3 Refunds are not applicable if the Client discontinues the
            service after it has commenced, except for issues verified and
            confirmed by The CarePal.
          </Paragraph>
        </Section>

        <Section number={5} title="Responsibilities of The CarePal">
          <Paragraph>
            5.1 The CarePal ensures that all assigned professionals are
            verified, trained, and qualified for the agreed services.
          </Paragraph>
          <Paragraph>
            5.2 The CarePal is responsible for replacing any assigned
            professional who fails to meet professional standards, subject to
            written notice from the Client.
          </Paragraph>
        </Section>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.continuationTitle}>
          SERVICE AGREEMENT - TERMS AND SIGNATURES
        </Text>
        <Section number={6} title="Responsibilities of the Client">
          <Paragraph>
            6.1 The Client agrees to treat the assigned professional
            respectfully and professionally and to adhere to the agreed
            schedules and conditions.
          </Paragraph>
          <Paragraph>
            6.2 The Client must notify The CarePal immediately of any issues
            regarding the assigned professional's performance or behaviour.
          </Paragraph>
        </Section>
        <Section number={7} title="Termination">
          <Paragraph>
            7.1 Either party may terminate this Agreement with{" "}
            <Bold>
              {AGREEMENT_TERMS.terminationNoticeDays} days' prior written notice
            </Bold>
            , subject to settlement of all dues.
          </Paragraph>
          <Paragraph>
            7.2 Immediate termination is allowed in cases of misconduct, breach
            of agreement, or unforeseen circumstances, subject to mutual
            discussion.
          </Paragraph>
        </Section>
        <Section number={8} title="Limitation of Liability">
          <Paragraph>
            The CarePal will not be liable for any indirect, incidental, or
            consequential damages arising out of the services provided.
            Liability is limited to the fees paid for the specific period of the
            service.
          </Paragraph>
        </Section>
        <Section number={9} title="Dispute Resolution">
          <Paragraph>
            Any disputes arising out of this Agreement shall first be resolved
            amicably. If unresolved, disputes will be subject to arbitration
            under the Indian Arbitration and Conciliation Act, 1996, with the
            venue in <Bold>{AGREEMENT_TERMS.arbitrationCity}</Bold>.
          </Paragraph>
        </Section>
        <Section number={10} title="Governing Law">
          <Paragraph>
            This Agreement shall be governed by and construed under the laws of
            India.
          </Paragraph>
        </Section>
        <Section number={11} title="Miscellaneous">
          <Paragraph>
            11.1 Amendments to this Agreement must be made in writing and signed
            by both parties.
          </Paragraph>
          <Paragraph>
            11.2 This Agreement constitutes the entire understanding between the
            parties and supersedes all prior agreements.
          </Paragraph>
        </Section>
        <View style={styles.signatures} wrap={false}>
          <Text style={styles.signatureIntro}>Signed by the parties</Text>
          <View style={styles.signatureColumns}>
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureHeading}>For The CarePal</Text>
              <Text style={styles.signatureDetail}>
                Name:{" "}
                <Bold>
                  {data.signerName.trim() || "[Authorized signatory]"}
                </Bold>
              </Text>
              <Text style={styles.signatureDetail}>
                Designation: {data.signerTitle.trim() || "[Designation]"}
              </Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Authorized signature</Text>
              <Text>Date: {signatureDate(data.providerSignatureDate)}</Text>
            </View>
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureHeading}>For the Client</Text>
              <Text style={styles.signatureDetail}>
                Name: <Bold>{client}</Bold>
              </Text>
              {data.clientRelationship.trim() ? (
                <Text style={styles.signatureDetail}>
                  Relationship: {data.clientRelationship.trim()}
                </Text>
              ) : (
                <Text style={styles.signatureDetail}>
                  Client / authorized representative
                </Text>
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Client signature</Text>
              <Text>Date: {signatureDate(data.clientSignatureDate)}</Text>
            </View>
          </View>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.continuationTitle}>
          CAREGIVER DETAILS AND VALIDATIONS
        </Text>
        <View style={styles.profile}>
          <ProfileRow label="Name" value={caregiver} />
          <ProfileRow label="Role" value={role} />
          <ProfileRow
            label="Address"
            value={data.caregiverAddress.trim() || "[Caregiver address]"}
          />
          <ProfileRow
            label="Education"
            value={
              data.caregiverEducation.trim() || "[Education / qualification]"
            }
          />
          <ProfileRow label="Certified" value={data.certificationStatus} />
          <ProfileRow
            label="Government ID proof"
            value={data.governmentIdProof.trim() || "Not provided"}
          />
          <ProfileRow
            label="Police verification"
            value={data.policeVerification}
          />
        </View>
        <Text style={styles.scopeIntro}>
          <Bold>Scope of Work:</Bold> The assigned {role} shall provide{" "}
          {serviceType} services for up to{" "}
          <Bold>{data.hoursPerDay} hours per day</Bold>. {description} The
          agreed duties are listed below.
        </Text>
        {selectedScope.map((group) => (
          <View key={group.id} style={styles.scopeGroup} wrap={false}>
            <Text style={styles.scopeHeading}>{group.title}</Text>
            {group.items.map((item) => (
              <Duty key={item}>{item}</Duty>
            ))}
          </View>
        ))}
        {customDuties.length ? (
          <>
            <View wrap={false} style={styles.scopeGroup}>
              <Text style={styles.scopeHeading}>Additional agreed duties</Text>
              <Duty>{customDuties[0]}</Duty>
            </View>
            {customDuties.slice(1).map((duty, index) => (
              <Duty key={index}>{duty}</Duty>
            ))}
          </>
        ) : null}
        {!selectedScope.length && !customDuties.length ? (
          <Paragraph>[Select the agreed duties in the editor.]</Paragraph>
        ) : null}
        <Footer />
      </Page>
    </Document>
  );
}

export default AgreementDocument;
