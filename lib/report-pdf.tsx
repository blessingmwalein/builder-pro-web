/**
 * Professional PDF report generator using @react-pdf/renderer.
 * Call `downloadReportPDF(...)` from a client component button handler.
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#6366f1",
  dark: "#1e1b4b",
  muted: "#6b7280",
  border: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
  red: "#ef4444",
  green: "#22c55e",
  amber: "#f59e0b",
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { backgroundColor: C.white, paddingTop: 48, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, fontFamily: "Helvetica" },
  coverPage: { backgroundColor: C.dark, paddingTop: 80, paddingBottom: 80, paddingHorizontal: 60 },

  // Cover
  coverLogo: { fontSize: 28, color: C.white, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  coverSubtitle: { fontSize: 11, color: "#a5b4fc", marginBottom: 48 },
  coverTitle: { fontSize: 22, color: C.white, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  coverMeta: { fontSize: 10, color: "#c7d2fe", marginBottom: 4 },
  coverDivider: { borderTop: 1, borderColor: "#4338ca", marginVertical: 32 },

  // Header (page header)
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: C.border, paddingBottom: 8, marginBottom: 16 },
  pageHeaderLeft: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.dark },
  pageHeaderRight: { fontSize: 8, color: C.muted },

  // Section
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 8, marginTop: 16 },
  sectionSubtitle: { fontSize: 9, color: C.muted, marginBottom: 10 },

  // KPI grid
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiBox: { flex: 1, backgroundColor: C.bg, borderRadius: 4, padding: 10, borderLeft: 3, borderColor: C.primary },
  kpiLabel: { fontSize: 8, color: C.muted, marginBottom: 3 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.dark },
  kpiSub: { fontSize: 7, color: C.muted, marginTop: 2 },

  // Table
  table: { marginBottom: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: C.bg, borderBottom: 1, borderColor: C.border, paddingVertical: 5, paddingHorizontal: 6 },
  tableRow: { flexDirection: "row", borderBottom: 1, borderColor: C.border, paddingVertical: 4, paddingHorizontal: 6 },
  tableRowAlt: { flexDirection: "row", borderBottom: 1, borderColor: C.border, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: C.bg },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.muted },
  td: { fontSize: 8, color: C.dark },
  tdMuted: { fontSize: 8, color: C.muted },
  tdRed: { fontSize: 8, color: C.red, fontFamily: "Helvetica-Bold" },
  tdGreen: { fontSize: 8, color: C.green, fontFamily: "Helvetica-Bold" },

  // Summary totals row
  totalsRow: { flexDirection: "row", backgroundColor: "#ede9fe", paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginTop: 2 },
  totalsLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.dark },
  totalsValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.primary },

  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTop: 1, borderColor: C.border, paddingTop: 6 },
  footerText: { fontSize: 7, color: C.muted },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(v: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Shared page wrapper ──────────────────────────────────────────────────────

function ReportPage({ title, date, children }: { title: string; date: string; children: React.ReactNode }) {
  return (
    <Page size="A4" style={S.page}>
      <View style={S.pageHeader} fixed>
        <Text style={S.pageHeaderLeft}>{title}</Text>
        <Text style={S.pageHeaderRight}>Generated {date}</Text>
      </View>
      {children}
      <View style={S.footer} fixed>
        <Text style={S.footerText}>ownit2buildit — Confidential</Text>
        <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverPage({ reportTitle, companyName, dateFrom, dateTo, generatedBy }: {
  reportTitle: string; companyName: string;
  dateFrom: string; dateTo: string; generatedBy: string;
}) {
  return (
    <Page size="A4" style={S.coverPage}>
      <Text style={S.coverLogo}>ownit2buildit</Text>
      <Text style={S.coverSubtitle}>{companyName}</Text>
      <View style={S.coverDivider} />
      <Text style={S.coverTitle}>{reportTitle}</Text>
      <Text style={S.coverMeta}>Period: {dateFrom} — {dateTo}</Text>
      <Text style={S.coverMeta}>Generated: {fmtDate(new Date())}</Text>
      <Text style={S.coverMeta}>Generated by: {generatedBy}</Text>
    </Page>
  );
}

// ─── KPI row helper ───────────────────────────────────────────────────────────

function KpiRow({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <View style={S.kpiRow}>
      {items.map((k) => (
        <View key={k.label} style={S.kpiBox}>
          <Text style={S.kpiLabel}>{k.label}</Text>
          <Text style={S.kpiValue}>{k.value}</Text>
          {k.sub && <Text style={S.kpiSub}>{k.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function TableHeader({ cols }: { cols: { label: string; flex: number; align?: "right" | "left" }[] }) {
  return (
    <View style={S.tableHeader}>
      {cols.map((c) => (
        <Text key={c.label} style={[S.th, { flex: c.flex, textAlign: c.align ?? "left" }]}>{c.label}</Text>
      ))}
    </View>
  );
}

function TableRow({ cells, alt }: { cells: { value: string; flex: number; align?: "right" | "left"; style?: object }[]; alt?: boolean }) {
  return (
    <View style={alt ? S.tableRowAlt : S.tableRow}>
      {cells.map((c, i) => (
        <Text key={i} style={[S.td, { flex: c.flex, textAlign: c.align ?? "left" }, c.style ?? {}]}>{c.value}</Text>
      ))}
    </View>
  );
}

// ─── Report documents ─────────────────────────────────────────────────────────

interface ReportMeta { companyName: string; generatedBy: string; dateFrom: string; dateTo: string; currency: string; }

// --- Budget Variance ---
function BudgetVariancePDF({ data, meta }: { data: import("@/app/(dashboard)/reports/page").BudgetVarianceReport; meta: ReportMeta }) {
  const date = fmtDate(new Date());
  const fc = (v: number) => fmtCurrency(v, meta.currency);
  return (
    <Document>
      <CoverPage reportTitle="Budget Variance Report" companyName={meta.companyName} dateFrom={meta.dateFrom} dateTo={meta.dateTo} generatedBy={meta.generatedBy} />
      <ReportPage title="Budget Variance Report" date={date}>
        <KpiRow items={[
          { label: "Total Planned", value: fc(data.totals.planned) },
          { label: "Total Actual", value: fc(data.totals.actual) },
          { label: "Variance", value: fc(data.totals.variance), sub: data.totals.variance >= 0 ? "Under budget" : "Over budget" },
          { label: "Over Budget Lines", value: String(data.overBudgetCount), sub: `${data.atRiskCount} at risk` },
        ]} />
        <Text style={S.sectionTitle}>Budget Lines</Text>
        <View style={S.table}>
          <TableHeader cols={[
            { label: "Project", flex: 3 }, { label: "Category", flex: 2 },
            { label: "Planned", flex: 2, align: "right" }, { label: "Actual", flex: 2, align: "right" },
            { label: "Variance", flex: 2, align: "right" }, { label: "Used %", flex: 1, align: "right" }, { label: "Status", flex: 1 },
          ]} />
          {data.rows.map((r, i) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              { value: r.projectName, flex: 3 },
              { value: r.category, flex: 2 },
              { value: fc(r.planned), flex: 2, align: "right" },
              { value: fc(r.actual), flex: 2, align: "right" },
              { value: fc(r.variance), flex: 2, align: "right", style: r.variance < 0 ? S.tdRed : S.tdGreen },
              { value: `${r.pctUsed}%`, flex: 1, align: "right" },
              { value: r.overBudget ? "Over" : r.atRisk ? "At Risk" : "OK", flex: 1, style: r.overBudget ? S.tdRed : r.atRisk ? { color: C.amber, fontSize: 8 } : S.tdGreen },
            ]} />
          ))}
          <View style={S.totalsRow}>
            <Text style={[S.totalsLabel, { flex: 7 }]}>Totals</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totals.planned)}</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totals.actual)}</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totals.variance)}</Text>
            <Text style={{ flex: 2 }} />
          </View>
        </View>
      </ReportPage>
    </Document>
  );
}

// --- Profitability ---
function ProfitabilityPDF({ data, meta }: { data: import("@/app/(dashboard)/reports/page").ProfitReport; meta: ReportMeta }) {
  const date = fmtDate(new Date());
  const fc = (v: number) => fmtCurrency(v, meta.currency);
  return (
    <Document>
      <CoverPage reportTitle="Profitability Report" companyName={meta.companyName} dateFrom={meta.dateFrom} dateTo={meta.dateTo} generatedBy={meta.generatedBy} />
      <ReportPage title="Profitability Report" date={date}>
        <KpiRow items={[
          { label: "Total Revenue", value: fc(data.totals.revenue) },
          { label: "Total Cost", value: fc(data.totals.actualCost) },
          { label: "Gross Profit", value: fc(data.totals.grossProfit) },
          { label: "Overall Margin", value: `${data.totals.margin}%` },
        ]} />
        <Text style={S.sectionTitle}>Project Profitability</Text>
        <View style={S.table}>
          <TableHeader cols={[
            { label: "Project", flex: 4 }, { label: "Status", flex: 2 },
            { label: "Revenue", flex: 2, align: "right" }, { label: "Cost", flex: 2, align: "right" },
            { label: "Gross Profit", flex: 2, align: "right" }, { label: "Margin %", flex: 1, align: "right" },
          ]} />
          {data.rows.map((r, i) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              { value: r.name, flex: 4 }, { value: r.status, flex: 2 },
              { value: fc(r.revenue), flex: 2, align: "right" },
              { value: fc(r.actualCost), flex: 2, align: "right" },
              { value: fc(r.grossProfit), flex: 2, align: "right", style: r.grossProfit >= 0 ? S.tdGreen : S.tdRed },
              { value: `${r.margin}%`, flex: 1, align: "right", style: r.margin >= 0 ? S.tdGreen : S.tdRed },
            ]} />
          ))}
          <View style={S.totalsRow}>
            <Text style={[S.totalsLabel, { flex: 6 }]}>Totals</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totals.revenue)}</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totals.actualCost)}</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totals.grossProfit)}</Text>
            <Text style={[S.totalsValue, { flex: 1, textAlign: "right" }]}>{data.totals.margin}%</Text>
          </View>
        </View>
      </ReportPage>
    </Document>
  );
}

// --- Labour ---
function LabourPDF({ data, meta }: { data: import("@/app/(dashboard)/reports/page").LabourReport; meta: ReportMeta }) {
  const date = fmtDate(new Date());
  const fc = (v: number) => fmtCurrency(v, meta.currency);
  return (
    <Document>
      <CoverPage reportTitle="Labour Report" companyName={meta.companyName} dateFrom={meta.dateFrom} dateTo={meta.dateTo} generatedBy={meta.generatedBy} />
      <ReportPage title={`Labour Report — ${meta.dateFrom} to ${meta.dateTo}`} date={date}>
        <KpiRow items={[
          { label: "Total Hours", value: `${data.totals.totalHours.toFixed(1)} hrs` },
          { label: "Total Labour Cost", value: fc(data.totals.labourCost) },
          { label: "Workers", value: String(data.rows.length) },
        ]} />
        <Text style={S.sectionTitle}>Labour by Employee</Text>
        <View style={S.table}>
          <TableHeader cols={[
            { label: "Worker", flex: 4 }, { label: "Regular Hrs", flex: 2, align: "right" },
            { label: "OT Hrs", flex: 2, align: "right" }, { label: "Total Hrs", flex: 2, align: "right" },
            { label: "Labour Cost", flex: 2, align: "right" }, { label: "Projects", flex: 4 },
          ]} />
          {data.rows.map((r, i) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              { value: r.name, flex: 4 },
              { value: `${(r as unknown as { regularHours?: number }).regularHours?.toFixed(1) ?? "—"}`, flex: 2, align: "right" },
              { value: `${(r as unknown as { overtimeHours?: number }).overtimeHours?.toFixed(1) ?? "—"}`, flex: 2, align: "right" },
              { value: `${r.totalHours.toFixed(1)}`, flex: 2, align: "right" },
              { value: fc(r.labourCost), flex: 2, align: "right" },
              { value: r.projects.slice(0, 2).join(", "), flex: 4 },
            ]} />
          ))}
          <View style={S.totalsRow}>
            <Text style={[S.totalsLabel, { flex: 4 }]}>Totals</Text>
            <Text style={{ flex: 4 }} />
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{data.totals.totalHours.toFixed(1)}</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totals.labourCost)}</Text>
            <Text style={{ flex: 4 }} />
          </View>
        </View>
      </ReportPage>
    </Document>
  );
}

// --- Financial Summary ---
function FinancialSummaryPDF({ data, meta }: { data: import("@/app/(dashboard)/reports/page").FinancialReport; meta: ReportMeta }) {
  const date = fmtDate(new Date());
  const fc = (v: number) => fmtCurrency(v, meta.currency);
  return (
    <Document>
      <CoverPage reportTitle="Financial Summary Report" companyName={meta.companyName} dateFrom={meta.dateFrom} dateTo={meta.dateTo} generatedBy={meta.generatedBy} />
      <ReportPage title="Financial Summary" date={date}>
        <KpiRow items={[
          { label: "Total Revenue", value: fc(data.totals.totalRevenue) },
          { label: "Collected", value: fc(data.totals.totalCollected) },
          { label: "Outstanding", value: fc(data.totals.totalOutstanding), sub: "Awaiting payment" },
        ]} />
        <Text style={S.sectionTitle}>Per-Project Financial Performance</Text>
        <View style={S.table}>
          <TableHeader cols={[
            { label: "Project", flex: 4 }, { label: "Status", flex: 2 },
            { label: "Revenue", flex: 2, align: "right" }, { label: "Cost", flex: 2, align: "right" },
            { label: "Margin %", flex: 2, align: "right" },
          ]} />
          {data.projects.map((p, i) => (
            <TableRow key={p.id} alt={i % 2 === 1} cells={[
              { value: p.name, flex: 4 },
              { value: (p as unknown as { status?: string }).status ?? "—", flex: 2 },
              { value: fc(p.revenue), flex: 2, align: "right" },
              { value: fc(p.actualCost), flex: 2, align: "right" },
              { value: `${p.profitMargin}%`, flex: 2, align: "right", style: p.profitMargin >= 0 ? S.tdGreen : S.tdRed },
            ]} />
          ))}
        </View>
      </ReportPage>
    </Document>
  );
}

// --- Materials ---
function MaterialsPDF({ data, meta }: { data: { totalCost: number; byCategory: { category: string; totalCost: number; quantity: number }[] }; meta: ReportMeta }) {
  const date = fmtDate(new Date());
  const fc = (v: number) => fmtCurrency(v, meta.currency);
  return (
    <Document>
      <CoverPage reportTitle="Materials Usage Report" companyName={meta.companyName} dateFrom={meta.dateFrom} dateTo={meta.dateTo} generatedBy={meta.generatedBy} />
      <ReportPage title="Materials Usage" date={date}>
        <KpiRow items={[
          { label: "Total Material Cost", value: fc(data.totalCost) },
          { label: "Categories", value: String(data.byCategory.length) },
        ]} />
        <Text style={S.sectionTitle}>Cost by Category</Text>
        <View style={S.table}>
          <TableHeader cols={[
            { label: "Category", flex: 4 }, { label: "Quantity", flex: 2, align: "right" },
            { label: "Total Cost", flex: 2, align: "right" }, { label: "% of Total", flex: 2, align: "right" },
          ]} />
          {data.byCategory.map((c, i) => {
            const pct = data.totalCost > 0 ? Math.round((c.totalCost / data.totalCost) * 100) : 0;
            return (
              <TableRow key={i} alt={i % 2 === 1} cells={[
                { value: c.category, flex: 4 },
                { value: Number(c.quantity).toLocaleString(), flex: 2, align: "right" },
                { value: fc(c.totalCost), flex: 2, align: "right" },
                { value: `${pct}%`, flex: 2, align: "right" },
              ]} />
            );
          })}
          <View style={S.totalsRow}>
            <Text style={[S.totalsLabel, { flex: 4 }]}>Total</Text>
            <Text style={{ flex: 2 }} />
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>{fc(data.totalCost)}</Text>
            <Text style={[S.totalsValue, { flex: 2, textAlign: "right" }]}>100%</Text>
          </View>
        </View>
      </ReportPage>
    </Document>
  );
}

// --- Productivity ---
function ProductivityPDF({ data, meta }: { data: import("@/app/(dashboard)/reports/page").ProductivityReport; meta: ReportMeta }) {
  const date = fmtDate(new Date());
  return (
    <Document>
      <CoverPage reportTitle="Productivity Report" companyName={meta.companyName} dateFrom={meta.dateFrom} dateTo={meta.dateTo} generatedBy={meta.generatedBy} />
      <ReportPage title="Productivity Report" date={date}>
        <KpiRow items={[
          { label: "Total Tasks", value: String(data.totals.total) },
          { label: "Completed", value: String(data.totals.done) },
          { label: "Completion Rate", value: `${data.totals.completionRate}%` },
        ]} />
        <Text style={S.sectionTitle}>Completion by Project</Text>
        <View style={S.table}>
          <TableHeader cols={[
            { label: "Project", flex: 4 }, { label: "Total", flex: 1, align: "right" },
            { label: "Done", flex: 1, align: "right" }, { label: "In Progress", flex: 1, align: "right" },
            { label: "Blocked", flex: 1, align: "right" }, { label: "Completion %", flex: 2, align: "right" },
            { label: "Est. Hrs", flex: 2, align: "right" }, { label: "Actual Hrs", flex: 2, align: "right" },
          ]} />
          {data.rows.map((r, i) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              { value: r.projectName, flex: 4 },
              { value: String(r.total), flex: 1, align: "right" },
              { value: String(r.done), flex: 1, align: "right" },
              { value: String(r.inProgress), flex: 1, align: "right" },
              { value: String(r.blocked), flex: 1, align: "right", style: r.blocked > 0 ? S.tdRed : S.td },
              { value: `${r.completionRate}%`, flex: 2, align: "right", style: r.completionRate >= 80 ? S.tdGreen : r.completionRate >= 50 ? S.td : S.tdRed },
              { value: r.estimatedHours > 0 ? `${r.estimatedHours.toFixed(0)}h` : "—", flex: 2, align: "right" },
              { value: r.actualHours > 0 ? `${r.actualHours.toFixed(0)}h` : "—", flex: 2, align: "right" },
            ]} />
          ))}
        </View>
      </ReportPage>
    </Document>
  );
}

// --- Delay ---
function DelayPDF({ data, meta }: { data: import("@/app/(dashboard)/reports/page").DelayReport; meta: ReportMeta }) {
  const date = fmtDate(new Date());
  return (
    <Document>
      <CoverPage reportTitle="Delay Report" companyName={meta.companyName} dateFrom={meta.dateFrom} dateTo={meta.dateTo} generatedBy={meta.generatedBy} />
      <ReportPage title="Delay Report" date={date}>
        <KpiRow items={[
          { label: "Delayed Projects", value: String(data.delayedCount), sub: data.delayedCount > 0 ? "Requires attention" : undefined },
          { label: "On Track", value: String(data.onTrackCount) },
          { label: "Total Projects", value: String(data.rows.length) },
        ]} />
        <Text style={S.sectionTitle}>Project Status</Text>
        <View style={S.table}>
          <TableHeader cols={[
            { label: "Project", flex: 4 }, { label: "Status", flex: 2 },
            { label: "Completion %", flex: 2, align: "right" }, { label: "End Date", flex: 2 },
            { label: "Days Delayed", flex: 2, align: "right" }, { label: "Blocked Stages", flex: 3 },
          ]} />
          {data.rows.map((r, i) => (
            <TableRow key={r.id} alt={i % 2 === 1} cells={[
              { value: r.name, flex: 4 },
              { value: r.status, flex: 2 },
              { value: `${r.completionPercent}%`, flex: 2, align: "right" },
              { value: r.endDate ? fmtDate(r.endDate) : "—", flex: 2 },
              { value: r.isDelayed ? String(r.daysDelayed) : "On Track", flex: 2, align: "right", style: r.isDelayed ? S.tdRed : S.tdGreen },
              { value: r.blockedStages.map((s) => s.name).join(", ") || "None", flex: 3 },
            ]} />
          ))}
        </View>
      </ReportPage>
    </Document>
  );
}

// ─── Public download function ─────────────────────────────────────────────────

export type ReportPDFMeta = ReportMeta;

export async function downloadReportPDF(
  reportType: string,
  data: unknown,
  meta: ReportMeta,
) {
  let element: React.ReactElement | null = null;
  const m = meta;
  const d = data as Record<string, unknown>;

  switch (reportType) {
    case "BUDGET_VARIANCE":
      element = <BudgetVariancePDF data={d as import("@/app/(dashboard)/reports/page").BudgetVarianceReport} meta={m} />;
      break;
    case "PROFITABILITY":
      element = <ProfitabilityPDF data={d as import("@/app/(dashboard)/reports/page").ProfitReport} meta={m} />;
      break;
    case "LABOUR":
      element = <LabourPDF data={d as import("@/app/(dashboard)/reports/page").LabourReport} meta={m} />;
      break;
    case "FINANCIAL":
      element = <FinancialSummaryPDF data={d as import("@/app/(dashboard)/reports/page").FinancialReport} meta={m} />;
      break;
    case "MATERIALS":
      element = <MaterialsPDF data={d as { totalCost: number; byCategory: { category: string; totalCost: number; quantity: number }[] }} meta={m} />;
      break;
    case "PRODUCTIVITY":
      element = <ProductivityPDF data={d as import("@/app/(dashboard)/reports/page").ProductivityReport} meta={m} />;
      break;
    case "DELAY":
      element = <DelayPDF data={d as import("@/app/(dashboard)/reports/page").DelayReport} meta={m} />;
      break;
    default:
      return;
  }

  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = reportType.toLowerCase().replace(/_/g, "-");
  a.href = url;
  a.download = `${slug}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
