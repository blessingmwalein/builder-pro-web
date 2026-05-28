"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3, Download, FileText, Clock, DollarSign, Package,
  TrendingUp, Loader2, AlertTriangle, CheckCircle2, Timer,
  RefreshCw, Building2, Users, Receipt,
} from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { useRequirePermission } from "@/lib/use-require-permission";
import { FEATURE_PERMS } from "@/lib/permissions";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { fetchFinancialDashboard } from "@/store/slices/financialsSlice";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudgetVarianceRow {
  projectName: string; category: string;
  planned: number; actual: number; variance: number; pctUsed: number;
  overBudget: boolean; atRisk: boolean;
}
export interface BudgetVarianceReport {
  rows: BudgetVarianceRow[];
  totals: { planned: number; actual: number; variance: number };
  overBudgetCount: number; atRiskCount: number;
}

export interface DelayRow {
  id: string; name: string; code: string; status: string;
  endDate?: string; completionPercent: number; daysDelayed: number; isDelayed: boolean;
  blockedStages: { name: string; status: string; daysOverdue: number }[];
}
export interface DelayReport { rows: DelayRow[]; delayedCount: number; onTrackCount: number; }

export interface ProfitRow {
  id: string; name: string; code: string; status: string;
  revenue: number; actualCost: number; grossProfit: number; margin: number;
}
export interface ProfitReport {
  rows: ProfitRow[];
  totals: { revenue: number; actualCost: number; grossProfit: number; margin: number };
}

export interface ProductivityRow {
  projectId: string; projectName: string;
  total: number; done: number; inProgress: number; blocked: number;
  estimatedHours: number; actualHours: number; completionRate: number;
  hoursEfficiency: number | null;
}
export interface ProductivityReport {
  rows: ProductivityRow[];
  totals: { total: number; done: number; completionRate: number };
}

export interface LabourRow { workerId: string; name: string; regularHours?: number; overtimeHours?: number; totalHours: number; labourCost: number; projects: string[]; }
export interface LabourReport { rows: LabourRow[]; totals: { totalHours: number; labourCost: number }; }

export interface FinancialProject { id: string; name: string; status?: string; revenue: number; actualCost: number; profitMargin: number; }
export interface FinancialReport {
  totals: { totalRevenue: number; totalCollected: number; totalOutstanding: number };
  projects: FinancialProject[];
}

export interface ProjectProgressReport {
  reportType: string;
  generatedAt: string;
  project: { id: string; name: string; code: string; status: string; completionPercent: number; startDate?: string; endDate?: string };
  tasks: { byStatus: Record<string, number>; total: number };
  budget: { planned: number; actual: number; variance: number; percentUsed: number; breakdown: { category: string; planned: number; actual: number }[] };
  materialCosts: number;
}

export type AnyReport = BudgetVarianceReport | DelayReport | ProfitReport | ProductivityReport | LabourReport | FinancialReport | ProjectProgressReport | null;

interface GeneratedReport {
  id: string;
  reportType: string;
  status: string;
  createdAt: string;
  generatedBy?: { firstName: string; lastName: string } | null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { type: "BUDGET_VARIANCE",  title: "Budget Variance",    description: "Planned vs actual per category, over-budget flags",   icon: DollarSign,    endpoint: "/reporting/budget-variance",   needsDateRange: false },
  { type: "DELAY",            title: "Delay Report",       description: "Projects past end date, blocked stages, days overdue", icon: AlertTriangle, endpoint: "/reporting/delays",            needsDateRange: false },
  { type: "PROFITABILITY",    title: "Profitability",      description: "Revenue, cost, gross profit and margin per project",   icon: TrendingUp,    endpoint: "/reporting/profitability",     needsDateRange: true  },
  { type: "PRODUCTIVITY",     title: "Productivity",       description: "Task completion rates and hour efficiency per project", icon: CheckCircle2,  endpoint: "/reporting/productivity",      needsDateRange: false },
  { type: "LABOUR",           title: "Labour Report",      description: "Hours and cost per worker per period",                 icon: Clock,         endpoint: "/reporting/labour",            needsDateRange: true  },
  { type: "MATERIALS",        title: "Materials Usage",    description: "Materials used, costs by category",                   icon: Package,       endpoint: "/reporting/materials",         needsDateRange: true  },
  { type: "FINANCIAL",        title: "Financial Summary",  description: "Revenue, costs, profit, outstanding invoices",         icon: DollarSign,    endpoint: "/reporting/financial-summary", needsDateRange: true  },
  { type: "PROJECT_PROGRESS", title: "Project Progress",   description: "Tasks, timeline, budget status (per project)",         icon: BarChart3,     endpoint: "/reporting/project-progress",  needsDateRange: false },
] as const;

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6"];

// ─── CSV helper ────────────────────────────────────────────────────────────────
function exportCSV(filename: string, rows: unknown[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  useRequirePermission(FEATURE_PERMS.reports);
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items: projects } = useAppSelector((s) => s.projects);
  const { tenant, user } = useAppSelector((s) => s.auth);
  const { dashboard } = useAppSelector((s) => s.financials);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [filterProjectId, setFilterProjectId] = useState("");
  const [reportData, setReportData] = useState<AnyReport>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [history, setHistory] = useState<GeneratedReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchFinancialDashboard());
  }, [dispatch]);

  async function generateReport(type: string) {
    const cfg = REPORT_TYPES.find((r) => r.type === type);
    if (!cfg || !cfg.endpoint) return;

    // Project Progress requires a specific project
    if (type === "PROJECT_PROGRESS") {
      if (!filterProjectId) {
        setSelectedType(type);
        setReportData(null);
        return; // UI will show the "select project" prompt
      }
      setSelectedType(type);
      setIsLoading(true);
      setReportData(null);
      try {
        const data = await api.get<AnyReport>(`${cfg.endpoint}/${filterProjectId}`);
        setReportData(data);
      } catch { setReportData(null); }
      finally { setIsLoading(false); }
      return;
    }

    setSelectedType(type);
    setIsLoading(true);
    setReportData(null);
    try {
      const params: Record<string, string> = {};
      if (cfg.needsDateRange) { params.from = dateFrom; params.to = dateTo; }
      if (filterProjectId) params.projectId = filterProjectId;
      const data = await api.get<AnyReport>(cfg.endpoint, params);
      setReportData(data);
    } catch { setReportData(null); }
    finally { setIsLoading(false); }
  }

  async function handlePdfExport() {
    if (!selectedType || !reportData) return;
    setPdfLoading(true);
    try {
      const { downloadReportPDF } = await import("@/lib/report-pdf");
      await downloadReportPDF(selectedType, reportData, {
        companyName: tenant?.name ?? "BuilderPro",
        generatedBy: user ? `${user.firstName} ${user.lastName}` : "User",
        dateFrom,
        dateTo,
        currency: tenant?.defaultCurrency ?? "USD",
      });
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setPdfLoading(false);
    }
  }

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api.get<GeneratedReport[]>("/reporting");
      setHistory(Array.isArray(data) ? data : []);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, []);

  // Project status breakdown from loaded projects
  const projectStatusCounts = projects.reduce<Record<string, number>>((acc, p) => {
    const s = (p as unknown as { status?: string }).status ?? "UNKNOWN";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const statusPieData = Object.entries(projectStatusCounts).map(([name, value]) => ({ name, value }));

  const selectedCfg = REPORT_TYPES.find((r) => r.type === selectedType);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Generate insights, build reports, and export professional documents." />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history" onClick={loadHistory}>Report History</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD TAB ── */}
        <TabsContent value="dashboard" className="mt-4 space-y-6">
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Projects",     value: dashboard?.activeProjects ?? "—",                     icon: Building2, color: "text-primary" },
              { label: "Total Billed",         value: formatCurrency(dashboard?.revenue.totalBilled ?? 0),  icon: Receipt,   color: "text-emerald-600" },
              { label: "Collected",            value: formatCurrency(dashboard?.revenue.totalCollected ?? 0),icon: TrendingUp,color: "text-primary" },
              { label: "Outstanding",          value: formatCurrency(dashboard?.revenue.totalOutstanding ?? 0),icon: AlertTriangle, color: "text-amber-600" },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <k.icon className={`h-5 w-5 ${k.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      { name: "This Month", billed: dashboard.revenue.monthlyBilled, collected: dashboard.revenue.monthlyCollected },
                      { name: "All Time",   billed: dashboard.revenue.totalBilled,   collected: dashboard.revenue.totalCollected },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: unknown) => typeof v === "number" ? formatCurrency(v) : ""} />
                      <Legend />
                      <Bar dataKey="billed"    name="Billed"    fill={CHART_COLORS[0]} radius={[3,3,0,0]} />
                      <Bar dataKey="collected" name="Collected" fill={CHART_COLORS[1]} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project status pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />Project Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                        label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                        labelLine={false}>
                        {statusPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No projects loaded</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Budget alerts + recent invoices */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />Budget Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!dashboard?.budgetAlerts?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No budget alerts — all projects within threshold.</p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.budgetAlerts.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
                        <p className="text-sm font-medium">{a.project?.name ?? "Unknown project"}</p>
                        <Badge variant={a.percentUsed >= 100 ? "destructive" : "secondary"} className="text-[10px]">{a.percentUsed}% used</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />Recent Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!dashboard?.recentInvoices?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet.</p>
                ) : (
                  <div className="divide-y">
                    {dashboard.recentInvoices.slice(0, 6).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <p className="font-medium">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{(inv as unknown as { client?: { name: string } }).client?.name ?? "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(Number(inv.totalAmount))}</p>
                          <Badge variant={inv.status === "PAID" ? "default" : inv.status === "OVERDUE" ? "destructive" : "secondary"} className="text-[10px]">{inv.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── GENERATE REPORT TAB ── */}
        <TabsContent value="generate" className="mt-4 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="flex flex-wrap items-end gap-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Project</Label>
                <Select value={filterProjectId || "ALL"} onValueChange={(v: string | null) => setFilterProjectId(v === "ALL" || !v ? "" : v)}>
                  <SelectTrigger className="w-52">
                    <SelectValue>{projects.find((p) => p.id === filterProjectId)?.name ?? "All projects"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All projects</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Report type grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REPORT_TYPES.map((r) => (
              <Card
                key={r.type}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedType === r.type ? "ring-2 ring-primary" : ""}`}
                onClick={() => void generateReport(r.type)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <r.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{r.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating report…</span>
              </CardContent>
            </Card>
          )}

          {/* ── BUDGET VARIANCE ── */}
          {!isLoading && selectedType === "BUDGET_VARIANCE" && reportData && (() => {
            const d = reportData as BudgetVarianceReport;
            return (
              <ReportCard title="Budget Variance" description={`${d.rows.length} budget lines · ${d.overBudgetCount} over budget · ${d.atRiskCount} at risk`}>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  {[
                    { label: "Total Planned", value: formatCurrency(d.totals.planned), color: "" },
                    { label: "Total Actual",  value: formatCurrency(d.totals.actual),  color: d.totals.actual > d.totals.planned ? "text-destructive" : "text-emerald-600" },
                    { label: "Variance",      value: formatCurrency(d.totals.variance), color: d.totals.variance >= 0 ? "text-emerald-600" : "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={d.rows.slice(0, 12)} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: unknown) => typeof v === "number" ? formatCurrency(v) : ""} />
                    <Legend />
                    <Bar dataKey="planned" name="Planned" fill={CHART_COLORS[0]} radius={[3,3,0,0]} />
                    <Bar dataKey="actual"  name="Actual"  fill={CHART_COLORS[3]} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {d.rows.map((row, i) => (
                    <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{row.category}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{row.projectName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(row.pctUsed, 100)} className="w-20 h-1.5" />
                        <span className="text-xs w-8 text-right">{row.pctUsed}%</span>
                        {row.overBudget && <Badge variant="destructive" className="text-[10px]">Over</Badge>}
                        {row.atRisk && !row.overBudget && <Badge variant="secondary" className="text-[10px]">At Risk</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
                <ExportBar
                  onCSV={() => exportCSV("budget-variance.csv", d.rows)}
                  onPDF={handlePdfExport}
                  pdfLoading={pdfLoading}
                />
              </ReportCard>
            );
          })()}

          {/* ── DELAY ── */}
          {!isLoading && selectedType === "DELAY" && reportData && (() => {
            const d = reportData as DelayReport;
            return (
              <ReportCard title="Delay Report" description={`${d.delayedCount} delayed · ${d.onTrackCount} on track`}>
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Delayed Projects</p>
                    <p className="text-2xl font-bold text-destructive">{d.delayedCount}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">On Track</p>
                    <p className="text-2xl font-bold text-emerald-600">{d.onTrackCount}</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {d.rows.map((row) => (
                    <div key={row.id} className={`rounded-lg border p-3 ${row.isDelayed ? "border-destructive/30 bg-destructive/5" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.status} · {row.completionPercent}% complete</p>
                        </div>
                        {row.isDelayed
                          ? <Badge variant="destructive" className="text-[10px]">{row.daysDelayed}d overdue</Badge>
                          : <Badge variant="outline" className="text-[10px]">On Track</Badge>}
                      </div>
                      {row.blockedStages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {row.blockedStages.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{s.name} ({s.daysOverdue}d)</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <ExportBar
                  onCSV={() => exportCSV("delay-report.csv", d.rows.map((r) => ({ ...r, blockedStages: r.blockedStages.length })))}
                  onPDF={handlePdfExport}
                  pdfLoading={pdfLoading}
                />
              </ReportCard>
            );
          })()}

          {/* ── PROFITABILITY ── */}
          {!isLoading && selectedType === "PROFITABILITY" && reportData && (() => {
            const d = reportData as ProfitReport;
            return (
              <ReportCard title="Profitability Report" description={`${d.rows.length} projects · Overall margin ${d.totals.margin}%`}>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  {[
                    { label: "Total Revenue",  value: formatCurrency(d.totals.revenue),      color: "text-emerald-600" },
                    { label: "Total Cost",     value: formatCurrency(d.totals.actualCost),   color: "text-destructive" },
                    { label: "Gross Profit",   value: formatCurrency(d.totals.grossProfit),  color: d.totals.grossProfit >= 0 ? "text-primary" : "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={d.rows.slice(0, 10)} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: unknown) => typeof v === "number" ? formatCurrency(v) : ""} />
                    <Legend />
                    <Bar dataKey="revenue"     name="Revenue"      fill={CHART_COLORS[1]} radius={[3,3,0,0]} />
                    <Bar dataKey="actualCost"  name="Cost"         fill={CHART_COLORS[3]} radius={[3,3,0,0]} />
                    <Bar dataKey="grossProfit" name="Gross Profit" fill={CHART_COLORS[0]} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ExportBar onCSV={() => exportCSV("profitability.csv", d.rows)} onPDF={handlePdfExport} pdfLoading={pdfLoading} />
              </ReportCard>
            );
          })()}

          {/* ── PRODUCTIVITY ── */}
          {!isLoading && selectedType === "PRODUCTIVITY" && reportData && (() => {
            const d = reportData as ProductivityReport;
            return (
              <ReportCard title="Productivity Report" description={`${d.totals.total} tasks · ${d.totals.completionRate}% overall completion`}>
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Tasks Complete</p>
                    <p className="text-2xl font-bold">{d.totals.done} / {d.totals.total}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold text-primary">{d.totals.completionRate}%</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d.rows.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 8, left: 80, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="projectName" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v: unknown) => typeof v === "number" ? `${v}%` : ""} />
                    <Bar dataKey="completionRate" name="Completion %" fill={CHART_COLORS[0]} radius={[0,3,3,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ExportBar onCSV={() => exportCSV("productivity.csv", d.rows)} onPDF={handlePdfExport} pdfLoading={pdfLoading} />
              </ReportCard>
            );
          })()}

          {/* ── LABOUR ── */}
          {!isLoading && selectedType === "LABOUR" && reportData && (() => {
            const d = reportData as LabourReport;
            return (
              <ReportCard title="Labour Report" description={`${dateFrom} to ${dateTo}`}>
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{d.totals.totalHours.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Labour Cost</p>
                    <p className="text-2xl font-bold">{formatCurrency(d.totals.labourCost)}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d.rows.slice(0, 10)} margin={{ top: 4, right: 8, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: unknown) => typeof v === "number" ? `${v}h` : ""} />
                    <Bar dataKey="totalHours" name="Hours" fill={CHART_COLORS[4]} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {d.rows.map((r) => (
                    <div key={r.workerId} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.projects.slice(0, 3).join(", ")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{r.totalHours.toFixed(1)} hrs</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(r.labourCost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <ExportBar onCSV={() => exportCSV("labour-report.csv", d.rows.map((r) => ({ ...r, projects: r.projects.join("; ") })))} onPDF={handlePdfExport} pdfLoading={pdfLoading} />
              </ReportCard>
            );
          })()}

          {/* ── FINANCIAL ── */}
          {!isLoading && selectedType === "FINANCIAL" && reportData && (() => {
            const d = reportData as FinancialReport;
            const pieData = [
              { name: "Collected",    value: d.totals.totalCollected },
              { name: "Outstanding",  value: d.totals.totalOutstanding },
            ];
            return (
              <ReportCard title="Financial Summary" description={`${d.projects.length} projects`}>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  {[
                    { label: "Total Revenue", value: formatCurrency(d.totals.totalRevenue),    color: "text-emerald-600" },
                    { label: "Collected",     value: formatCurrency(d.totals.totalCollected),  color: "text-primary" },
                    { label: "Outstanding",   value: formatCurrency(d.totals.totalOutstanding), color: "text-amber-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                        label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => typeof v === "number" ? formatCurrency(v) : ""} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 max-h-48 overflow-y-auto">
                    {d.projects.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                        <p className="font-medium truncate max-w-32">{p.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatCurrency(p.revenue)}</span>
                          <Badge variant={p.profitMargin >= 0 ? "outline" : "destructive"} className="text-[10px]">{p.profitMargin}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <ExportBar onCSV={() => exportCSV("financial-summary.csv", d.projects)} onPDF={handlePdfExport} pdfLoading={pdfLoading} />
              </ReportCard>
            );
          })()}

          {/* ── MATERIALS ── */}
          {!isLoading && selectedType === "MATERIALS" && reportData && (() => {
            const d = (reportData as unknown) as { totalCost: number; byCategory: { category: string; totalCost: number; quantity: number }[] };
            return (
              <ReportCard title="Materials Usage" description={`${d.byCategory.length} categories`}>
                <div className="mb-4 rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Material Cost</p>
                  <p className="text-2xl font-bold">{formatCurrency(d.totalCost)}</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={d.byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="totalCost" nameKey="category"
                      label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}>
                      {d.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => typeof v === "number" ? formatCurrency(v) : ""} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <ExportBar onCSV={() => exportCSV("materials-usage.csv", d.byCategory)} onPDF={handlePdfExport} pdfLoading={pdfLoading} />
              </ReportCard>
            );
          })()}

          {/* ── PROJECT PROGRESS — no project selected prompt ── */}
          {!isLoading && selectedType === "PROJECT_PROGRESS" && !filterProjectId && !reportData && (
            <Card>
              <CardContent className="py-10 text-center space-y-3">
                <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">Select a project to generate this report</p>
                <p className="text-xs text-muted-foreground">Use the Project filter above, then click Project Progress again.</p>
              </CardContent>
            </Card>
          )}

          {/* ── PROJECT PROGRESS — results ── */}
          {!isLoading && selectedType === "PROJECT_PROGRESS" && reportData && (() => {
            const d = reportData as ProjectProgressReport;
            const statusEntries = Object.entries(d.tasks.byStatus);
            const statusColors: Record<string, string> = { DONE: "text-emerald-600", IN_PROGRESS: "text-primary", BLOCKED: "text-destructive", TODO: "text-muted-foreground", PENDING: "text-muted-foreground" };
            return (
              <ReportCard title={`Project Progress — ${d.project.name}`} description={`${d.project.code} · ${d.project.status} · ${d.project.completionPercent}% complete`}>
                {/* KPI row */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Completion",      value: `${d.project.completionPercent}%`,     color: d.project.completionPercent >= 80 ? "text-emerald-600" : "text-primary" },
                    { label: "Total Tasks",      value: String(d.tasks.total),                 color: "" },
                    { label: "Budget Used",      value: `${d.budget.percentUsed}%`,            color: d.budget.percentUsed > 100 ? "text-destructive" : d.budget.percentUsed > 80 ? "text-amber-600" : "text-emerald-600" },
                    { label: "Material Costs",   value: formatCurrency(d.materialCosts),       color: "" },
                  ].map((k) => (
                    <div key={k.label} className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                      <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Task status + budget side by side */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Task breakdown */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tasks by Status</p>
                    <div className="divide-y rounded-md border">
                      {statusEntries.map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between px-3 py-2">
                          <span className={`text-sm font-medium ${statusColors[status] ?? ""}`}>{status.replace(/_/g, " ")}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget breakdown */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Budget by Category</p>
                    <div className="divide-y rounded-md border">
                      {d.budget.breakdown.map((b) => {
                        const pct = b.planned > 0 ? Math.round((b.actual / b.planned) * 100) : 0;
                        return (
                          <div key={b.category} className="px-3 py-2 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{b.category}</span>
                              <span className={`text-xs font-semibold ${b.actual > b.planned ? "text-destructive" : "text-emerald-600"}`}>{pct}%</span>
                            </div>
                            <Progress value={Math.min(pct, 100)} className="h-1.5" />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Planned {formatCurrency(b.planned)}</span>
                              <span>Actual {formatCurrency(b.actual)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Overall budget bar */}
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Overall Budget</span>
                    <span className={d.budget.actual > d.budget.planned ? "text-destructive" : "text-emerald-600"}>
                      {formatCurrency(d.budget.actual)} / {formatCurrency(d.budget.planned)}
                    </span>
                  </div>
                  <Progress value={Math.min(d.budget.percentUsed, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Variance: <span className={d.budget.variance >= 0 ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>{formatCurrency(d.budget.variance)}</span>
                  </p>
                </div>

                <ExportBar
                  onCSV={() => exportCSV(`project-progress-${d.project.code}.csv`, d.budget.breakdown.map((b) => ({ ...b, project: d.project.name, completionPct: d.project.completionPercent })))}
                  onPDF={() => {}}
                  pdfLoading={false}
                />
              </ReportCard>
            );
          })()}
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Report History</CardTitle>
                <CardDescription>Previously generated reports</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center">
                  <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No reports generated yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Generate a report from the Reports tab and it will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Report Type</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Generated By</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {history.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">
                            {REPORT_TYPES.find((t) => t.type === r.reportType)?.title ?? r.reportType}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {r.generatedBy ? `${r.generatedBy.firstName} ${r.generatedBy.lastName}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "FAILED" ? "destructive" : "secondary"} className="text-[10px]">
                              {r.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReportCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ExportBar({ onCSV, onPDF, pdfLoading }: { onCSV: () => void; onPDF: () => void; pdfLoading: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t">
      <Button variant="outline" size="sm" onClick={onCSV}>
        <FileText className="mr-2 h-3.5 w-3.5" /> Export CSV
      </Button>
      <Button size="sm" onClick={onPDF} disabled={pdfLoading}>
        {pdfLoading
          ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          : <Download className="mr-2 h-3.5 w-3.5" />}
        Export PDF
      </Button>
    </div>
  );
}
