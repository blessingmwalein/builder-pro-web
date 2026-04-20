import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { Invoice, Quote, Tenant } from "@/types";

const styles = StyleSheet.create({
  page: {
    padding: 26,
    fontSize: 10,
    color: "#111827",
  },
  letterhead: {
    backgroundColor: "#1E3A8A",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#F8FAFC",
  },
  companyMeta: {
    marginTop: 4,
    fontSize: 9,
    color: "#DBEAFE",
  },
  docTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: 700,
    color: "#F8FAFC",
  },
  docSubtitle: {
    marginTop: 1,
    fontSize: 9,
    color: "#BFDBFE",
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  metadataPill: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 9,
    color: "#1E40AF",
    fontWeight: 700,
  },
  partyGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  partyCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    padding: 8,
    flex: 1,
    marginRight: 8,
  },
  partyCardLast: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    padding: 8,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 3,
    fontWeight: 700,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 700,
  },
  partyText: {
    fontSize: 9,
    color: "#374151",
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    padding: 8,
    flex: 1,
    marginRight: 8,
  },
  infoCardLast: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    padding: 8,
    flex: 1,
  },
  label: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#6B7280",
  },
  value: {
    marginTop: 4,
    fontSize: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 700,
    marginTop: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colCategory: { width: "16%" },
  colDescription: { width: "40%" },
  colSmall: { width: "14%", textAlign: "right" },
  colWide: { width: "18%", textAlign: "right" },
  colHalf: { width: "50%" },
  totals: {
    width: 220,
    marginLeft: "auto",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalRowStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    marginTop: 4,
    fontWeight: 700,
    color: "#166534",
  },
  notesBlock: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 700,
  },
  notesText: {
    marginTop: 4,
    fontSize: 9,
    color: "#374151",
  },
});

type CompanyProfile = {
  displayName: string;
  countryCode?: string;
  defaultCurrency?: string;
  accountType?: string;
};

function currency(amount: number, code = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function normalizeCompany(tenant: Tenant | null, docPartyName?: string | null): CompanyProfile {
  if (tenant?.name) {
    return {
      displayName: tenant.name,
      countryCode: tenant.countryCode,
      defaultCurrency: tenant.defaultCurrency,
      accountType: tenant.accountType,
    };
  }

  return {
    displayName: docPartyName || "Builder Pro",
    defaultCurrency: "USD",
    accountType: "INDIVIDUAL",
  };
}

function CompanyLetterhead({
  company,
  title,
  subtitle,
}: {
  company: CompanyProfile;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.letterhead}>
      <Text style={styles.companyName}>{company.displayName}</Text>
      <Text style={styles.companyMeta}>
        {company.accountType === "INDIVIDUAL" ? "Individual Account" : "Company Account"}
        {company.countryCode ? ` | ${company.countryCode}` : ""}
        {company.defaultCurrency ? ` | ${company.defaultCurrency}` : ""}
      </Text>
      <Text style={styles.docTitle}>{title}</Text>
      <Text style={styles.docSubtitle}>{subtitle}</Text>
    </View>
  );
}

async function savePdfBlob(fileName: string, documentNode: ReactElement) {
  if (typeof window === "undefined") return;
  const blob = await pdf(documentNode).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadQuoteProformaPdf(quote: Quote, tenant: Tenant | null) {
  const company = normalizeCompany(tenant, quote.client?.name ?? null);
  const currencyCode = company.defaultCurrency || "USD";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <CompanyLetterhead
          company={company}
          title={`Proforma Quote ${quote.referenceNumber}`}
          subtitle={quote.title || "Proforma quote"}
        />

        <View style={styles.metadataRow}>
          <Text style={styles.metadataPill}>{quote.status || "DRAFT"}</Text>
          <Text style={styles.label}>Generated {formatDate(new Date().toISOString())}</Text>
        </View>

        <View style={styles.partyGrid}>
          <View style={styles.partyCard}>
            <Text style={styles.sectionHeading}>Provider</Text>
            <Text style={styles.partyName}>{company.displayName}</Text>
            <Text style={styles.partyText}>{company.accountType === "INDIVIDUAL" ? "Individual Account" : "Company Account"}</Text>
            <Text style={styles.partyText}>{company.countryCode || "-"}</Text>
          </View>
          <View style={styles.partyCardLast}>
            <Text style={styles.sectionHeading}>Client</Text>
            <Text style={styles.partyName}>{quote.client?.name || "-"}</Text>
            <Text style={styles.partyText}>{quote.client?.email || "No email provided"}</Text>
            <Text style={styles.partyText}>{quote.client?.phone || "No phone provided"}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{quote.referenceNumber}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.value}>{quote.project?.name || "-"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Issue Date</Text>
            <Text style={styles.value}>{formatDate(quote.issueDate)}</Text>
          </View>
          <View style={styles.infoCardLast}>
            <Text style={styles.label}>Expiry Date</Text>
            <Text style={styles.value}>{formatDate(quote.expiryDate)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colCategory}>Category</Text>
          <Text style={styles.colDescription}>Description</Text>
          <Text style={styles.colSmall}>Qty</Text>
          <Text style={styles.colWide}>Unit Price</Text>
          <Text style={styles.colWide}>Total</Text>
        </View>
        {quote.lineItems.map((item, index) => (
          <View key={`${item.description}-${index}`} style={styles.tableRow}>
            <Text style={styles.colCategory}>{item.category}</Text>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={styles.colSmall}>{String(item.quantity)}</Text>
            <Text style={styles.colWide}>{currency(item.unitPrice, currencyCode)}</Text>
            <Text style={styles.colWide}>{currency(item.total ?? item.quantity * item.unitPrice, currencyCode)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{currency(quote.subtotal, currencyCode)}</Text></View>
          <View style={styles.totalRow}><Text>Tax ({quote.taxRate || 0}%)</Text><Text>{currency(quote.taxAmount, currencyCode)}</Text></View>
          <View style={styles.totalRow}><Text>Discount</Text><Text>-{currency(quote.discountAmount || 0, currencyCode)}</Text></View>
          <View style={styles.totalRowStrong}><Text>Total</Text><Text>{currency(quote.total, currencyCode)}</Text></View>
        </View>

        {(quote.notes || quote.paymentTerms) && (
          <View style={styles.notesBlock}>
            {quote.notes ? (
              <>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{quote.notes}</Text>
              </>
            ) : null}
            {quote.paymentTerms ? (
              <>
                <Text style={styles.notesTitle}>Payment Terms</Text>
                <Text style={styles.notesText}>{quote.paymentTerms}</Text>
              </>
            ) : null}
          </View>
        )}
      </Page>
    </Document>
  );

  await savePdfBlob(`proforma-${quote.referenceNumber}.pdf`, doc);
}

export async function downloadInvoicePdf(invoice: Invoice, tenant: Tenant | null) {
  const company = normalizeCompany(tenant, invoice.client?.name ?? null);
  const currencyCode = company.defaultCurrency || "USD";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <CompanyLetterhead
          company={company}
          title={`Invoice ${invoice.invoiceNumber}`}
          subtitle="Tax invoice"
        />

        <View style={styles.metadataRow}>
          <Text style={styles.metadataPill}>{invoice.status || "DRAFT"}</Text>
          <Text style={styles.label}>Generated {formatDate(new Date().toISOString())}</Text>
        </View>

        <View style={styles.partyGrid}>
          <View style={styles.partyCard}>
            <Text style={styles.sectionHeading}>Provider</Text>
            <Text style={styles.partyName}>{company.displayName}</Text>
            <Text style={styles.partyText}>{company.accountType === "INDIVIDUAL" ? "Individual Account" : "Company Account"}</Text>
            <Text style={styles.partyText}>{company.countryCode || "-"}</Text>
          </View>
          <View style={styles.partyCardLast}>
            <Text style={styles.sectionHeading}>Client</Text>
            <Text style={styles.partyName}>{invoice.client?.name || "-"}</Text>
            <Text style={styles.partyText}>{invoice.client?.email || "No email provided"}</Text>
            <Text style={styles.partyText}>{invoice.client?.phone || "No phone provided"}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.value}>{invoice.project?.name || "-"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Issue Date</Text>
            <Text style={styles.value}>{formatDate(invoice.issueDate)}</Text>
          </View>
          <View style={styles.infoCardLast}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colHalf}>Description</Text>
          <Text style={styles.colSmall}>Qty</Text>
          <Text style={styles.colWide}>Unit Price</Text>
          <Text style={styles.colWide}>Total</Text>
        </View>
        {invoice.lineItems.map((item, index) => (
          <View key={`${item.description}-${index}`} style={styles.tableRow}>
            <Text style={styles.colHalf}>{item.description}</Text>
            <Text style={styles.colSmall}>{String(item.quantity)}</Text>
            <Text style={styles.colWide}>{currency(item.unitPrice, currencyCode)}</Text>
            <Text style={styles.colWide}>{currency(item.total ?? item.quantity * item.unitPrice, currencyCode)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{currency(invoice.subtotal, currencyCode)}</Text></View>
          <View style={styles.totalRow}><Text>Tax ({invoice.taxRate || 0}%)</Text><Text>{currency(invoice.taxAmount, currencyCode)}</Text></View>
          <View style={styles.totalRow}><Text>Paid</Text><Text>{currency(invoice.amountPaid || 0, currencyCode)}</Text></View>
          <View style={styles.totalRowStrong}><Text>Balance Due</Text><Text>{currency(invoice.balanceDue || 0, currencyCode)}</Text></View>
        </View>

        {(invoice.notes || invoice.paymentTerms) && (
          <View style={styles.notesBlock}>
            {invoice.notes ? (
              <>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </>
            ) : null}
            {invoice.paymentTerms ? (
              <>
                <Text style={styles.notesTitle}>Payment Terms</Text>
                <Text style={styles.notesText}>{invoice.paymentTerms}</Text>
              </>
            ) : null}
          </View>
        )}
      </Page>
    </Document>
  );

  await savePdfBlob(`invoice-${invoice.invoiceNumber}.pdf`, doc);
}
