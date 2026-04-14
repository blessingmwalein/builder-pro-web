"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  CheckSquare,
  DollarSign,
  Receipt,
  Clock,
  AlertTriangle,
  TrendingUp,
  Timer,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useAppDispatch, useAppSelector, useAuth, useFormatCurrency } from "@/lib/hooks";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { fetchFinancialDashboard } from "@/store/slices/financialsSlice";
import { fetchMyQueue, fetchTasks } from "@/store/slices/tasksSlice";
import { fetchActiveEntry, fetchTimeEntries, fetchWeeklySummary } from "@/store/slices/timeTrackingSlice";

import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { StatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toStatusLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function getCurrentWeekStartISO() {
  const date = new Date();
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
}

type NormalizedFinancial = {
  activeProjects: number;
  totalRevenue: number;
  totalCollected: number;
  monthlyBilled: number;
  monthlyCollected: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  budgetAlerts: string[];
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    dueDate: string;
    clientName: string;
  }>;
  cashFlow: Array<{ month: string; revenue: number; costs: number }>;
  projectProfitability: Array<{ projectId: string; projectName: string; revenue: number; costs: number; profit: number }>;
};

function normalizeFinancial(raw: unknown): NormalizedFinancial {
  const data = (raw ?? {}) as Record<string, unknown>;
  const revenue = ((data.revenue ?? {}) as Record<string, unknown>);
  const cashFlowRaw = Array.isArray(data.cashFlow) ? data.cashFlow : [];
  const profitabilityRaw = Array.isArray(data.projectProfitability) ? data.projectProfitability : [];
  const alertsRaw = Array.isArray(data.budgetAlerts) ? data.budgetAlerts : [];
  const recentInvoicesRaw = Array.isArray(data.recentInvoices) ? data.recentInvoices : [];

  const totalRevenue = toNumber(data.totalRevenue ?? revenue.totalBilled ?? data.revenue ?? data.total_income);
  const totalCollected = toNumber(revenue.totalCollected);
  const monthlyBilled = toNumber(revenue.monthlyBilled);
  const monthlyCollected = toNumber(revenue.monthlyCollected);
  const outstandingInvoices = toNumber(data.outstandingInvoices ?? revenue.totalOutstanding ?? data.outstanding ?? data.invoiceOutstanding);
  const totalCosts = toNumber(data.totalCosts ?? data.costs ?? data.total_expenses);
  const totalProfit = toNumber(data.totalProfit ?? data.profit, totalRevenue - totalCosts);
  const profitMargin = toNumber(data.profitMargin ?? data.margin, totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0);

  return {
    activeProjects: toNumber(data.activeProjects),
    totalRevenue,
    totalCollected,
    monthlyBilled,
    monthlyCollected,
    totalCosts,
    totalProfit,
    profitMargin,
    outstandingInvoices,
    budgetAlerts: alertsRaw
      .map((a) => {
        if (typeof a === "string") return a;
        if (a && typeof a === "object") {
          const row = a as Record<string, unknown>;
          return toString(row.message ?? row.title ?? row.code, "");
        }
        return "";
      })
      .filter(Boolean),
    recentInvoices: recentInvoicesRaw
      .map((inv) => {
        const row = (inv ?? {}) as Record<string, unknown>;
        const client = (row.client ?? {}) as Record<string, unknown>;
        return {
          id: toString(row.id),
          invoiceNumber: toString(row.invoiceNumber, "Invoice"),
          status: toString(row.status, "DRAFT"),
          totalAmount: toNumber(row.totalAmount ?? row.total),
          dueDate: toString(row.dueDate),
          clientName: toString(client.name, "-"),
        };
      })
      .filter((inv) => inv.id),
    cashFlow: cashFlowRaw.map((item, idx) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        month: toString(row.month, `M${idx + 1}`),
        revenue: toNumber(row.revenue),
        costs: toNumber(row.costs),
      };
    }),
    projectProfitability: profitabilityRaw.map((item, idx) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        projectId: toString(row.projectId, `project-${idx}`),
        projectName: toString(row.projectName, "Project"),
        revenue: toNumber(row.revenue),
        costs: toNumber(row.costs),
        profit: toNumber(row.profit),
      };
    }),
  };
}

const PIE_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const formatCurrency = useFormatCurrency();

  const { items: projects } = useAppSelector((s) => s.projects);
  const { dashboard: financialRaw } = useAppSelector((s) => s.financials);
  const { myQueue, items: tasks } = useAppSelector((s) => s.tasks);
  const { activeEntry, entries, weeklySummary } = useAppSelector((s) => s.timeTracking);

  useEffect(() => {
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchFinancialDashboard());
    dispatch(fetchMyQueue());
    dispatch(fetchTasks({ limit: 200 }));
    dispatch(fetchActiveEntry());
    dispatch(fetchTimeEntries({ limit: 100 }));
    dispatch(fetchWeeklySummary(getCurrentWeekStartISO()));
  }, [dispatch]);

  const financials = useMemo(() => normalizeFinancial(financialRaw), [financialRaw]);

  const activeProjects = useMemo(() => projects.filter((p) => p.status === "ACTIVE"), [projects]);
  const activeProjectCount = Math.max(activeProjects.length, financials.activeProjects);

  const projectStatusChart = useMemo(() => {
    const counts = projects.reduce<Record<string, number>>((acc, p) => {
      const key = p.status || "UNKNOWN";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name: toStatusLabel(name), value }));
  }, [projects]);

  const taskStatusChart = useMemo(() => {
    const counts = tasks.reduce<Record<string, number>>((acc, t) => {
      const key = t.status || "UNKNOWN";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name: toStatusLabel(name), value }));
  }, [tasks]);

  const urgentTasks = useMemo(
    () => myQueue.filter((t) => t.priority === "HIGH" || t.priority === "CRITICAL"),
    [myQueue]
  );

  const timeInsights = useMemo(() => {
    const today = new Date().toDateString();
    const todayEntries = entries.filter((e) => new Date(e.clockInAt).toDateString() === today);
    const todayHours = todayEntries.reduce((sum, e) => sum + toNumber(e.totalHours), 0);
    const pendingCount = entries.filter((e) => e.status === "PENDING").length;
    const approvedCount = entries.filter((e) => e.status === "APPROVED").length;

    return {
      todayHours,
      todayEntries: todayEntries.length,
      pendingCount,
      approvedCount,
    };
  }, [entries]);

  const budgetUtilization = useMemo(() => {
    const revenue = financials.totalRevenue;
    const costs = financials.totalCosts;
    if (revenue <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((costs / revenue) * 100)));
  }, [financials.totalRevenue, financials.totalCosts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName || "there"}`}
        description="Operational dashboard with project, budget, task, and time-tracking insights."
      />

      {activeEntry && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Currently clocked in</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Since {new Date(activeEntry.clockInAt).toLocaleTimeString()}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push("/time-tracking")}>View Timer</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Active Projects" value={activeProjectCount} icon={FolderKanban} subtitle={`${projects.length} total projects`} />
        <StatsCard title="My Tasks" value={myQueue.length} icon={CheckSquare} subtitle={`${urgentTasks.length} urgent`} />
        <StatsCard title="Revenue" value={formatCurrency(financials.totalRevenue)} icon={DollarSign} trend={{ value: financials.profitMargin, label: "margin" }} />
        <StatsCard title="Outstanding" value={formatCurrency(financials.outstandingInvoices)} icon={Receipt} subtitle="Unpaid invoices" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Billed</p>
              <p className="text-lg font-bold">{formatCurrency(financials.totalRevenue)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Collected</p>
              <p className="text-lg font-bold">{formatCurrency(financials.totalCollected)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Monthly Billed</p>
              <p className="text-lg font-bold">{formatCurrency(financials.monthlyBilled)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Monthly Collected</p>
              <p className="text-lg font-bold">{formatCurrency(financials.monthlyCollected)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/invoices")}>View all</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {financials.recentInvoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent invoices.</p>
            ) : (
              financials.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                    <p className="text-xs text-muted-foreground">Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={inv.status} />
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(inv.totalAmount)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {financials.budgetAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {financials.budgetAlerts.map((alert, idx) => (
              <p key={`${alert}-${idx}`} className="text-sm text-amber-700 dark:text-amber-300">{alert}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Budget Trend (Revenue vs Costs)</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/financials")}>Financials</Button>
          </CardHeader>
          <CardContent>
            {financials.cashFlow.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No cash flow data available yet.</p>
            ) : (
              <div className="h-[280px] min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                  <BarChart data={financials.cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(toNumber(v))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#16a34a" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="costs" fill="#dc2626" name="Costs" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cost-to-Revenue Utilization</span>
                <span className="font-semibold">{budgetUtilization}%</span>
              </div>
              <Progress value={budgetUtilization} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Time Tracking Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Today Hours</p>
              <p className="text-xl font-bold">{timeInsights.todayHours.toFixed(2)}h</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Today Entries</p>
              <p className="text-xl font-bold">{timeInsights.todayEntries}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="text-xl font-bold">{timeInsights.pendingCount}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Approved Entries</p>
              <p className="text-xl font-bold">{timeInsights.approvedCount}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Week Total</p>
              <p className="text-xl font-bold">{toNumber(weeklySummary?.totalHours).toFixed(2)}h</p>
            </div>
            <Button className="w-full" variant="outline" onClick={() => router.push("/time-tracking")}>Open Time Tracking</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Projects by Status</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>Projects</Button>
          </CardHeader>
          <CardContent>
            {projectStatusChart.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No project status data yet.</p>
            ) : (
              <div className="h-[280px] min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                  <PieChart>
                    <Pie data={projectStatusChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                      {projectStatusChart.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Tasks by Status</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")}>Tasks</Button>
          </CardHeader>
          <CardContent>
            {taskStatusChart.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No task status data yet.</p>
            ) : (
              <div className="h-[280px] min-w-0 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                  <PieChart>
                    <Pie data={taskStatusChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                      {taskStatusChart.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">My Task Queue</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")}>View all</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {myQueue.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tasks assigned to you.</p>
            ) : (
              myQueue.slice(0, 8).map((task) => (
                <button
                  key={task.id}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                  onClick={() => router.push("/tasks")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                      {task.project?.name ? <Badge variant="secondary">{task.project.name}</Badge> : null}
                    </div>
                  </div>
                  {task.dueDate ? (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Profitability</CardTitle>
          </CardHeader>
          <CardContent>
            {financials.projectProfitability.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Profitability appears after revenue/cost data is posted.</p>
            ) : (
              <div className="space-y-3">
                {financials.projectProfitability.slice(0, 5).map((p) => {
                  const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                  return (
                    <div key={p.projectId} className="rounded-lg border p-3">
                      <p className="text-sm font-medium truncate">{p.projectName}</p>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Margin</span>
                        <span className={margin >= 0 ? "text-emerald-600" : "text-destructive"}>{margin.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Profit</span>
                        <span className="font-semibold">{formatCurrency(p.profit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "New Project", icon: FolderKanban, href: "/projects/new" },
            { label: "Create Quote", icon: Receipt, href: "/quotes/new" },
            { label: "Log Time", icon: Timer, href: "/time-tracking" },
            { label: "Financials", icon: DollarSign, href: "/financials" },
          ].map((action) => (
            <Button key={action.label} variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(action.href)}>
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
