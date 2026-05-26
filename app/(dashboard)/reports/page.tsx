"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, Download, FileText, Clock, DollarSign, Package,
  TrendingUp, Loader2, AlertTriangle, CheckCircle2, Timer,
} from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { useRequirePermission } from "@/lib/use-require-permission";
import { FEATURE_PERMS } from "@/lib/permissions";
import { fetchProjects } from "@/store/slices/projectsSlice";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface BudgetVarianceRow {
  projectName: string; category: string;
  planned: number; actual: number; variance: number; pctUsed: number;
  overBudget: boolean; atRisk: boolean;
}
interface BudgetVarianceReport {
  rows: BudgetVarianceRow[];
  totals: { planned: number; actual: number; variance: number };
  overBudgetCount: number; atRiskCount: number;
}

interface DelayRow {
  id: string; name: string; code: string; status: string;
  endDate?: string; completionPercent: number; daysDelayed: number; isDelayed: boolean;
  blockedStages: { name: string; status: string; daysOverdue: number }[];
}
interface DelayReport { rows: DelayRow[]; delayedCount: number; onTrackCount: number; }

interface ProfitRow {
  id: string; name: string; code: string; status: string;
  revenue: number; actualCost: number; grossProfit: number; margin: number;
}
interface ProfitReport {
  rows: ProfitRow[];
  totals: { revenue: number; actualCost: number; grossProfit: number; margin: number };
}

interface ProductivityRow {
  projectId: string; projectName: string;
  total: number; done: number; inProgress: number; blocked: number;
  estimatedHours: number; actualHours: number; completionRate: number;
  hoursEfficiency: number | null;
}
interface ProductivityReport {
  rows: ProductivityRow[];
  totals: { total: number; done: number; completionRate: number };
}

interface LabourRow { workerId: string; name: string; totalHours: number; labourCost: number; projects: string[]; }
interface LabourReport { rows: LabourRow[]; totals: { totalHours: number; labourCost: number }; }

interface FinancialProject { id: string; name: string; revenue: number; actualCost: number; profitMargin: number; }
interface FinancialReport {
  totals: { totalRevenue: number; totalCollected: number; totalOutstanding: number };
  projects: FinancialProject[];
}

type AnyReport = BudgetVarianceReport | DelayReport | ProfitReport | ProductivityReport | LabourReport | FinancialReport | null;

// ─── Config ───────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { type: "BUDGET_VARIANCE", title: "Budget Variance", description: "Planned vs actual per category, over-budget flags", icon: DollarSign, endpoint: "/reporting/budget-variance", needsDateRange: false },
  { type: "DELAY", title: "Delay Report", description: "Projects past end date, blocked stages, days overdue", icon: AlertTriangle, endpoint: "/reporting/delays", needsDateRange: false },
  { type: "PROFITABILITY", title: "Profitability", description: "Revenue, cost, gross profit and margin per project", icon: TrendingUp, endpoint: "/reporting/profitability", needsDateRange: true },
  { type: "PRODUCTIVITY", title: "Productivity", description: "Task completion rates and hour efficiency per project", icon: CheckCircle2, endpoint: "/reporting/productivity", needsDateRange: false },
  { type: "LABOUR", title: "Labour Report", description: "Hours and cost per worker per period", icon: Clock, endpoint: "/reporting/labour", needsDateRange: true },
  { type: "MATERIALS", title: "Materials Usage", description: "Materials used, costs by category", icon: Package, endpoint: "/reporting/materials", needsDateRange: true },
  { type: "FINANCIAL", title: "Financial Summary", description: "Revenue, costs, profit, outstanding invoices", icon: DollarSign, endpoint: "/reporting/financial-summary", needsDateRange: true },
  { type: "PROJECT_PROGRESS", title: "Project Progress", description: "Tasks, timeline, budget status (per project)", icon: BarChart3, endpoint: null, needsDateRange: false },
] as const;

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6"];

// ─── CSV export helper ────────────────────────────────────────────────────────
function exportCSV(filename: string, rows: unknown[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  useRequirePermission(FEATURE_PERMS.reports);
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items: projects } = useAppSelector((s) => s.projects);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [filterProjectId, setFilterProjectId] = useState("");
  const [reportData, setReportData] = useState<AnyReport>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects({ limit: 100 }));
  }, [dispatch]);

  async function generateReport(type: string) {
    const cfg = REPORT_TYPES.find((r) => r.type === type);
    if (!cfg || !cfg.endpoint) return;

    setSelectedType(type);
    setIsLoading(true);
    setReportData(null);
    try {
      const params: Record<string, string> = {};
      if (cfg.needsDateRange) { params.from = dateFrom; params.to = dateTo; }
      if (filterProjectId) params.projectId = filterProjectId;
      const data = await api.get<AnyReport>(cfg.endpoint, params);
      setReportData(data);
    } catch {
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedCfg = REPORT_TYPES.find((r) => r.type === selectedType);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Generate insights from your project data." />

      {/* Filters bar */}
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
            <Label className="text-xs">Project filter</Label>
            <Select value={filterProjectId || "ALL"} onValueChange={(v: string | null) => setFilterProjectId(v === "ALL" || !v ? "" : v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All projects">
                  {projects.find((p) => p.id === filterProjectId)?.name ?? "All projects"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All projects</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4 space-y-6">
          {/* Report type grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REPORT_TYPES.map((r) => (
              <Card
                key={r.type}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedType === r.type ? "ring-2 ring-primary" : ""}`}
                onClick={() => generateReport(r.type)}
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
                    { label: "Total Actual", value: formatCurrency(d.totals.actual), color: d.totals.actual > d.totals.planned ? "text-destructive" : "text-emerald-600" },
                    { label: "Variance", value: formatCurrency(d.totals.variance), color: d.totals.variance >= 0 ? "text-emerald-600" : "text-destructive" },
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
                    <Bar dataKey="planned" name="Planned" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
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
                <ExportBar onCSV={() => exportCSV("budget-variance.csv", d.rows)} />
              </ReportCard>
            );
          })()}

          {/* ── DELAY REPORT ── */}
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
                        {row.isDelayed ? (
                          <Badge variant="destructive" className="text-[10px]">{row.daysDelayed}d overdue</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">On Track</Badge>
                        )}
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
                <ExportBar onCSV={() => exportCSV("delay-report.csv", d.rows.map((r) => ({ ...r, blockedStages: r.blockedStages.length })))} />
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
                    { label: "Total Revenue", value: formatCurrency(d.totals.revenue), color: "text-emerald-600" },
                    { label: "Total Cost", value: formatCurrency(d.totals.actualCost), color: "text-destructive" },
                    { label: "Gross Profit", value: formatCurrency(d.totals.grossProfit), color: d.totals.grossProfit >= 0 ? "text-primary" : "text-destructive" },
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
                    <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS[1]} radius={[3,3,0,0]} />
                    <Bar dataKey="actualCost" name="Cost" fill={CHART_COLORS[3]} radius={[3,3,0,0]} />
                    <Bar dataKey="grossProfit" name="Gross Profit" fill={CHART_COLORS[0]} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <ExportBar onCSV={() => exportCSV("profitability.csv", d.rows)} />
              </ReportCard>
            );
          })()}

          {/* ── PRODUCTIVITY ── */}
          {!isLoading && selectedType === "PRODUCTIVITY" && reportData && (() => {
            const d = reportData as ProductivityReport;
            return (
              <ReportCard title="Productivity Report" description={`${d.totals.total} tasks total · ${d.totals.completionRate}% overall completion`}>
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
                <ExportBar onCSV={() => exportCSV("productivity.csv", d.rows)} />
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
                <div className="space-y-2 max-h-64 overflow-y-auto">
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
                <ExportBar onCSV={() => exportCSV("labour-report.csv", d.rows.map((r) => ({ ...r, projects: r.projects.join("; ") })))} />
              </ReportCard>
            );
          })()}

          {/* ── FINANCIAL ── */}
          {!isLoading && selectedType === "FINANCIAL" && reportData && (() => {
            const d = reportData as FinancialReport;
            const pieData = [
              { name: "Collected", value: d.totals.totalCollected },
              { name: "Outstanding", value: d.totals.totalOutstanding },
            ];
            return (
              <ReportCard title="Financial Summary" description={`${d.projects.length} projects`}>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  {[
                    { label: "Total Revenue", value: formatCurrency(d.totals.totalRevenue), color: "text-emerald-600" },
                    { label: "Collected", value: formatCurrency(d.totals.totalCollected), color: "text-primary" },
                    { label: "Outstanding", value: formatCurrency(d.totals.totalOutstanding), color: "text-amber-600" },
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
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}>
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
                <ExportBar onCSV={() => exportCSV("financial-summary.csv", d.projects)} />
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
                    <Pie data={d.byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="totalCost" nameKey="category" label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}>
                      {d.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: unknown) => typeof v === "number" ? formatCurrency(v) : ""} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <ExportBar onCSV={() => exportCSV("materials-usage.csv", d.byCategory)} />
              </ReportCard>
            );
          })()}

        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Previously generated reports will appear here.</p>
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

function ExportBar({ onCSV }: { onCSV: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <Button variant="outline" size="sm" onClick={onCSV}>
        <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
      </Button>
    </div>
  );
}
