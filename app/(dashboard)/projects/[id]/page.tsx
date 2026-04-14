"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Clock,
  DollarSign,
  AlertTriangle,
  Users,
  FileText,
  Receipt,
  Package,
  Hammer,
  Plus,
  Trash2,
  Timer,
} from "lucide-react";

import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import api from "@/lib/api";
import {
  fetchProjectDashboard,
  fetchProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "@/store/slices/projectsSlice";
import { createQuote, fetchQuotes } from "@/store/slices/quotesSlice";
import { createInvoice, fetchInvoices } from "@/store/slices/invoicesSlice";
import {
  fetchTimeEntries,
  fetchActiveEntry,
  fetchWeeklySummary,
  clockIn,
  clockOut,
  approveTimeEntry,
} from "@/store/slices/timeTrackingSlice";

import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { User as AppUser, PaginatedResponse } from "@/types";

type NormalizedDashboard = {
  project: {
    id: string;
    companyId: string;
    name: string;
    code: string;
    description: string;
    status: string;
    projectType: string;
    siteAddress: string;
    gpsLat: number | null;
    gpsLng: number | null;
    baselineBudget: number;
    actualCost: number;
    completionPercent: number;
    startDate: string;
    endDate: string;
    actualEndDate: string;
    createdAt: string;
    updatedAt: string;
    counts: {
      tasks: number;
      timeEntries: number;
      materialLogs: number;
      documents: number;
    };
  };
  client: {
    id: string;
    name: string;
    contactPerson: string;
    clientType: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
  };
  team: {
    projectManager: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      employeeCode: string;
      jobTitle: string;
    } | null;
    membersCount: number;
    members: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      userId: string;
    }>;
  };
  timeline: {
    daysElapsed: number;
    totalDays: number;
    daysRemaining: number;
    completionFromTasks: number;
  };
  budget: {
    baselineBudget: number;
    planned: number;
    actual: number;
    variance: number;
    baselineVariance: number;
    projectRecordedVariance: number;
    percentUsed: number;
    baselineUtilization: number;
    byCategory: Array<{ category: string; planned: number; actual: number; variance: number }>;
  };
  financials: {
    quotes: { count: number; totalAmount: number };
    invoices: { count: number; totalAmount: number; paidAmount: number; balanceAmount: number };
    variations: { count: number; totalAmount: number };
    labour: { entries: number; regularHours: number; overtimeHours: number; totalLabourCost: number };
    materials: { logs: number; totalCost: number };
  };
  tasks: {
    total: number;
    done: number;
    overdueCount: number;
    byStatus: Record<string, number>;
    recentActivity: Array<{ id: string; title: string; status: string; updatedAt: string }>;
  };
  alerts: Array<{ message: string }>;
};

function getNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function formatStatusLabel(input: string): string {
  return input
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function getCurrentWeekStartISO() {
  const date = new Date();
  const day = date.getDay();
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
}

function normalizeDashboard(raw: unknown, fallbackMembers: Array<{
  userId: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  role: string;
}>): NormalizedDashboard {
  const data = (raw ?? {}) as Record<string, unknown>;
  const project = (data.project ?? {}) as Record<string, unknown>;
  const client = (data.client ?? {}) as Record<string, unknown>;
  const team = (data.team ?? {}) as Record<string, unknown>;
  const timeline = (data.timeline ?? {}) as Record<string, unknown>;
  const budget = (data.budget ?? {}) as Record<string, unknown>;
  const financials = (data.financials ?? {}) as Record<string, unknown>;
  const tasks = (data.tasks ?? {}) as Record<string, unknown>;

  const byStatusRaw = (tasks.byStatus ?? {}) as Record<string, unknown>;
  const byStatus: Record<string, number> = Object.entries(byStatusRaw).reduce((acc, [k, v]) => {
    acc[k] = getNumber(v);
    return acc;
  }, {} as Record<string, number>);

  const recentTasksRaw = Array.isArray(tasks.recentActivity) ? tasks.recentActivity : [];
  const recentTaskActivity = recentTasksRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: getString(item.id, `task-activity-${index}`),
      title: getString(item.title, "Task updated"),
      status: getString(item.status, "TODO"),
      updatedAt: getString(item.updatedAt, new Date().toISOString()),
    }));

  const rawMembers = Array.isArray(team.members) ? team.members : [];
  const normalizedMembers = rawMembers
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: getString(item.id, `member-${index}`),
      userId: getString(item.userId, getString(item.id, `member-${index}`)),
      firstName: getString(item.firstName, "User"),
      lastName: getString(item.lastName, ""),
      email: getString(item.email, "-"),
      role: getString(item.role, "Member"),
    }));

  const members = normalizedMembers.length
    ? normalizedMembers
    : fallbackMembers.map((m) => ({
        id: m.user.id || m.userId,
        userId: m.user.id || m.userId,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        role: m.role,
      }));

  const pmRaw = (team.projectManager ?? null) as Record<string, unknown> | null;
  const pmEmployee = pmRaw && typeof pmRaw.employee === "object" && pmRaw.employee ? (pmRaw.employee as Record<string, unknown>) : null;

  const alertsRaw = (data.alerts ?? {}) as Record<string, unknown>;
  const alerts = Object.entries(alertsRaw)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => ({ message: formatStatusLabel(key) }));

  const financialQuotes = (financials.quotes ?? {}) as Record<string, unknown>;
  const financialInvoices = (financials.invoices ?? {}) as Record<string, unknown>;
  const financialVariations = (financials.variations ?? {}) as Record<string, unknown>;
  const financialLabour = (financials.labour ?? {}) as Record<string, unknown>;
  const financialMaterials = (financials.materials ?? {}) as Record<string, unknown>;

  const byCategoryRaw = Array.isArray(budget.byCategory) ? budget.byCategory : [];
  const byCategory = byCategoryRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      category: getString(item.category, `Category ${index + 1}`),
      planned: getNumber(item.planned),
      actual: getNumber(item.actual),
      variance: getNumber(item.variance),
    }));

  const projectClient = (project.client ?? {}) as Record<string, unknown>;

  return {
    project: {
      id: getString(project.id),
      companyId: getString(project.companyId),
      name: getString(project.name, "Project"),
      code: getString(project.code, "-"),
      description: getString(project.description, ""),
      status: getString(project.status, "DRAFT"),
      projectType: getString(project.projectType, "-"),
      siteAddress: getString(project.siteAddress, "-"),
      gpsLat: typeof project.gpsLat === "number" ? project.gpsLat : null,
      gpsLng: typeof project.gpsLng === "number" ? project.gpsLng : null,
      baselineBudget: getNumber(project.baselineBudget),
      actualCost: getNumber(project.actualCost),
      completionPercent: getNumber(project.completionPercent),
      startDate: getString(project.startDate),
      endDate: getString(project.endDate),
      actualEndDate: getString(project.actualEndDate),
      createdAt: getString(project.createdAt),
      updatedAt: getString(project.updatedAt),
      counts: {
        tasks: getNumber((project.counts as Record<string, unknown> | undefined)?.tasks),
        timeEntries: getNumber((project.counts as Record<string, unknown> | undefined)?.timeEntries),
        materialLogs: getNumber((project.counts as Record<string, unknown> | undefined)?.materialLogs),
        documents: getNumber((project.counts as Record<string, unknown> | undefined)?.documents),
      },
    },
    client: {
      id: getString(client.id, getString(projectClient.id)),
      name: getString(client.name, getString(projectClient.name, "-")),
      contactPerson: getString(client.contactPerson, "-"),
      clientType: getString(client.clientType, "-"),
      email: getString(client.email, getString(projectClient.email, "-")),
      phone: getString(client.phone, getString(projectClient.phone, "-")),
      address: getString(client.address, "-"),
      notes: getString(client.notes, ""),
    },
    team: {
      projectManager: pmRaw
        ? {
            firstName: getString(pmRaw.firstName, "-"),
            lastName: getString(pmRaw.lastName, ""),
            email: getString(pmRaw.email, "-"),
            phone: getString(pmRaw.phone, "-"),
            employeeCode: getString(pmEmployee?.employeeCode, "-"),
            jobTitle: getString(pmEmployee?.jobTitle, "-"),
          }
        : null,
      membersCount: Math.max(getNumber(team.membersCount), members.length),
      members,
    },
    timeline: {
      daysElapsed: getNumber(timeline.daysElapsed),
      totalDays: Math.max(1, getNumber(timeline.totalDays, 1)),
      daysRemaining: getNumber(timeline.daysRemaining),
      completionFromTasks: getNumber(timeline.completionFromTasks),
    },
    budget: {
      baselineBudget: getNumber(budget.baselineBudget, getNumber(project.baselineBudget)),
      planned: getNumber(budget.planned),
      actual: getNumber(budget.actual),
      variance: getNumber(budget.variance),
      baselineVariance: getNumber(budget.baselineVariance),
      projectRecordedVariance: getNumber(budget.projectRecordedVariance),
      percentUsed: getNumber(budget.percentUsed),
      baselineUtilization: getNumber(budget.baselineUtilization),
      byCategory,
    },
    financials: {
      quotes: {
        count: getNumber(financialQuotes.count),
        totalAmount: getNumber(financialQuotes.totalAmount),
      },
      invoices: {
        count: getNumber(financialInvoices.count),
        totalAmount: getNumber(financialInvoices.totalAmount),
        paidAmount: getNumber(financialInvoices.paidAmount),
        balanceAmount: getNumber(financialInvoices.balanceAmount),
      },
      variations: {
        count: getNumber(financialVariations.count),
        totalAmount: getNumber(financialVariations.totalAmount),
      },
      labour: {
        entries: getNumber(financialLabour.entries),
        regularHours: getNumber(financialLabour.regularHours),
        overtimeHours: getNumber(financialLabour.overtimeHours),
        totalLabourCost: getNumber(financialLabour.totalLabourCost),
      },
      materials: {
        logs: getNumber(financialMaterials.logs),
        totalCost: getNumber(financialMaterials.totalCost),
      },
    },
    tasks: {
      total: getNumber(tasks.total, Object.values(byStatus).reduce((sum, count) => sum + count, 0)),
      done: getNumber(tasks.done, getNumber(byStatus.DONE)),
      overdueCount: getNumber(tasks.overdueCount),
      byStatus,
      recentActivity: recentTaskActivity,
    },
    alerts,
  };
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const projectId = params.id as string;

  const { dashboard, members } = useAppSelector((s) => s.projects);
  const { entries, activeEntry, weeklySummary } = useAppSelector((s) => s.timeTracking);

  const [users, setUsers] = useState<AppUser[]>([]);

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const [manualEntryModalOpen, setManualEntryModalOpen] = useState(false);

  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("Site Supervisor");

  const [quoteTitle, setQuoteTitle] = useState("");
  const [quoteIssueDate, setQuoteIssueDate] = useState("");
  const [quoteExpiryDate, setQuoteExpiryDate] = useState("");
  const [quoteLineDescription, setQuoteLineDescription] = useState("");
  const [quoteLineQty, setQuoteLineQty] = useState("1");
  const [quoteLineUnitPrice, setQuoteLineUnitPrice] = useState("0");

  const [invoiceIssueDate, setInvoiceIssueDate] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceQty, setInvoiceQty] = useState("1");
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState("0");

  const [clockInTaskId, setClockInTaskId] = useState("");
  const [clockInLat, setClockInLat] = useState("");
  const [clockInLng, setClockInLng] = useState("");

  const [clockOutBreakMinutes, setClockOutBreakMinutes] = useState("0");
  const [clockOutLat, setClockOutLat] = useState("");
  const [clockOutLng, setClockOutLng] = useState("");

  const [manualTaskId, setManualTaskId] = useState("");
  const [manualClockInAt, setManualClockInAt] = useState("");
  const [manualClockOutAt, setManualClockOutAt] = useState("");
  const [manualBreakMinutes, setManualBreakMinutes] = useState("30");
  const [manualNotes, setManualNotes] = useState("");

  useEffect(() => {
    if (!projectId) return;

    dispatch(fetchProjectDashboard(projectId));
    dispatch(fetchProjectMembers(projectId));
    dispatch(fetchTimeEntries({ projectId, limit: 50 }));
    dispatch(fetchActiveEntry());
    dispatch(fetchWeeklySummary(getCurrentWeekStartISO()));

    void api
      .get<PaginatedResponse<AppUser>>("/users", { limit: 200, isActive: true })
      .then((res) => setUsers(res.items))
      .catch(() => setUsers([]));
  }, [dispatch, projectId]);

  const view = useMemo(() => normalizeDashboard(dashboard ?? {}, members), [dashboard, members]);
  const timelinePercent = Math.max(0, Math.min(100, Math.round((view.timeline.daysElapsed / view.timeline.totalDays) * 100)));

  const availableUsers = useMemo(() => {
    const assigned = new Set(view.team.members.map((m) => m.userId));
    return users.filter((u) => !assigned.has(u.id));
  }, [users, view.team.members]);

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  async function refreshProjectData() {
    await dispatch(fetchProjectDashboard(projectId));
    await dispatch(fetchProjectMembers(projectId));
    await dispatch(fetchTimeEntries({ projectId, limit: 50 }));
    await dispatch(fetchActiveEntry());
    await dispatch(fetchWeeklySummary(getCurrentWeekStartISO()));
  }

  async function handleCreateQuote() {
    if (!view.client.id) return;
    await dispatch(
      createQuote({
        clientId: view.client.id,
        projectId,
        title: quoteTitle || `${view.project.name} Quote`,
        issueDate: quoteIssueDate,
        expiryDate: quoteExpiryDate || undefined,
        lineItems: [
          {
            category: "Labour",
            description: quoteLineDescription || "Project work",
            quantity: Number(quoteLineQty || 1),
            unitPrice: Number(quoteLineUnitPrice || 0),
          },
        ],
      })
    ).unwrap();

    await dispatch(fetchQuotes({ projectId }));
    setQuoteModalOpen(false);
    setQuoteTitle("");
    setQuoteIssueDate("");
    setQuoteExpiryDate("");
    setQuoteLineDescription("");
    setQuoteLineQty("1");
    setQuoteLineUnitPrice("0");
    router.push("/quotes");
  }

  async function handleCreateInvoice() {
    if (!view.client.id) return;
    await dispatch(
      createInvoice({
        clientId: view.client.id,
        projectId,
        issueDate: invoiceIssueDate,
        dueDate: invoiceDueDate,
        lineItems: [
          {
            description: invoiceDescription || "Project invoice line",
            quantity: Number(invoiceQty || 1),
            unitPrice: Number(invoiceUnitPrice || 0),
          },
        ],
      })
    ).unwrap();

    await dispatch(fetchInvoices({ projectId }));
    setInvoiceModalOpen(false);
    setInvoiceIssueDate("");
    setInvoiceDueDate("");
    setInvoiceDescription("");
    setInvoiceQty("1");
    setInvoiceUnitPrice("0");
    router.push("/invoices");
  }

  async function handleAddMember() {
    if (!memberUserId) return;
    await dispatch(addProjectMember({ projectId, userId: memberUserId, role: memberRole })).unwrap();
    setMemberModalOpen(false);
    setMemberUserId("");
    setMemberRole("Site Supervisor");
  }

  async function handleRemoveMember(userId: string) {
    await dispatch(removeProjectMember({ projectId, userId })).unwrap();
  }

  async function handleClockIn() {
    await dispatch(
      clockIn({
        projectId,
        taskId: clockInTaskId || undefined,
        gpsInLat: clockInLat ? Number(clockInLat) : undefined,
        gpsInLng: clockInLng ? Number(clockInLng) : undefined,
      })
    ).unwrap();
    setClockInModalOpen(false);
    setClockInTaskId("");
    setClockInLat("");
    setClockInLng("");
    await refreshProjectData();
  }

  async function handleClockOut() {
    if (!activeEntry?.id) return;
    await dispatch(
      clockOut({
        entryId: activeEntry.id,
        data: {
          breakMinutes: Number(clockOutBreakMinutes || 0),
          gpsOutLat: clockOutLat ? Number(clockOutLat) : undefined,
          gpsOutLng: clockOutLng ? Number(clockOutLng) : undefined,
        },
      })
    ).unwrap();

    setClockOutModalOpen(false);
    setClockOutBreakMinutes("0");
    setClockOutLat("");
    setClockOutLng("");
    await refreshProjectData();
  }

  async function handleManualEntry() {
    await api.post("/time-tracking/manual", {
      projectId,
      taskId: manualTaskId || undefined,
      clockInAt: manualClockInAt,
      clockOutAt: manualClockOutAt,
      breakMinutes: Number(manualBreakMinutes || 0),
      notes: manualNotes || undefined,
    });

    setManualEntryModalOpen(false);
    setManualTaskId("");
    setManualClockInAt("");
    setManualClockOutAt("");
    setManualBreakMinutes("30");
    setManualNotes("");
    await refreshProjectData();
  }

  async function handleApproveTimeEntry(entryId: string, status: "APPROVED" | "REJECTED") {
    await dispatch(approveTimeEntry({ entryId, status })).unwrap();
    await refreshProjectData();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={view.project.name} description={`${view.project.code} - ${formatStatusLabel(view.project.projectType)}`}>
        <Button variant="outline" size="sm" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button size="sm" onClick={() => setQuoteModalOpen(true)}>
          <FileText className="mr-2 h-4 w-4" /> New Quote
        </Button>
        <Button size="sm" variant="outline" onClick={() => setInvoiceModalOpen(true)}>
          <Receipt className="mr-2 h-4 w-4" /> New Invoice
        </Button>
        <StatusBadge status={view.project.status} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Completion" value={`${view.project.completionPercent}%`} icon={CheckSquare} subtitle={`${view.tasks.done}/${view.tasks.total} tasks done`} />
        <StatsCard title="Baseline Budget" value={formatCurrency(view.budget.baselineBudget)} icon={DollarSign} subtitle={`${view.budget.baselineUtilization}% utilized`} />
        <StatsCard title="Days Remaining" value={view.timeline.daysRemaining} icon={Calendar} subtitle={`${view.timeline.totalDays} total duration`} />
        <StatsCard title="Task Alerts" value={view.tasks.overdueCount} icon={Clock} subtitle="Overdue tasks" />
      </div>

      {view.alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="py-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Alerts</span>
            </div>
            <div className="space-y-1">
              {view.alerts.map((alert, i) => (
                <p key={`${alert.message}-${i}`} className="text-sm text-amber-700 dark:text-amber-300">{alert.message}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({view.tasks.total})</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="team">Team ({view.team.membersCount})</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Project Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Timeline Progress</span>
                    <span className="font-semibold">{timelinePercent}%</span>
                  </div>
                  <Progress value={timelinePercent} className="h-2" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Task Completion</span>
                    <span className="font-semibold">{view.timeline.completionFromTasks}%</span>
                  </div>
                  <Progress value={view.timeline.completionFromTasks} className="h-2" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className="font-semibold">{view.budget.percentUsed}%</span>
                  </div>
                  <Progress value={view.budget.percentUsed} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-lg font-bold">{view.project.counts.tasks}</p>
                    <p className="text-[10px] text-muted-foreground">Tasks</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-lg font-bold">{view.project.counts.timeEntries}</p>
                    <p className="text-[10px] text-muted-foreground">Time Logs</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-lg font-bold">{view.project.counts.materialLogs}</p>
                    <p className="text-[10px] text-muted-foreground">Material Logs</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-lg font-bold">{view.project.counts.documents}</p>
                    <p className="text-[10px] text-muted-foreground">Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Client Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Name</span><span className="font-medium text-right">{view.client.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Contact</span><span className="font-medium text-right">{view.client.contactPerson}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Type</span><span className="font-medium text-right">{formatStatusLabel(view.client.clientType)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Email</span><span className="font-medium text-right">{view.client.email}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span className="font-medium text-right">{view.client.phone}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Address</span><span className="font-medium text-right">{view.client.address}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Task Breakdown</CardTitle>
              <Button size="sm" onClick={() => router.push("/tasks")}>View All Tasks</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.keys(view.tasks.byStatus).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No task status data yet.</p>
                ) : (
                  Object.entries(view.tasks.byStatus).map(([status, count]) => (
                    <div key={status} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{formatStatusLabel(status)}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Overdue Tasks</span>
                <span className="font-semibold">{view.tasks.overdueCount}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Budget Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Baseline Budget</p><p className="text-lg font-bold">{formatCurrency(view.budget.baselineBudget)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Planned</p><p className="text-lg font-bold">{formatCurrency(view.budget.planned)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Actual</p><p className="text-lg font-bold">{formatCurrency(view.budget.actual)}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setQuoteModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Quote</Button>
            <Button variant="outline" onClick={() => router.push(`/quotes?projectId=${projectId}`)}>View Quotes</Button>
            <Button onClick={() => setInvoiceModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Invoice</Button>
            <Button variant="outline" onClick={() => router.push(`/invoices?projectId=${projectId}`)}>View Invoices</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard title="Quotes" value={view.financials.quotes.count} icon={FileText} subtitle={formatCurrency(view.financials.quotes.totalAmount)} />
            <StatsCard title="Invoices" value={view.financials.invoices.count} icon={Receipt} subtitle={formatCurrency(view.financials.invoices.totalAmount)} />
            <StatsCard title="Invoice Balance" value={formatCurrency(view.financials.invoices.balanceAmount)} icon={DollarSign} subtitle={`Paid ${formatCurrency(view.financials.invoices.paidAmount)}`} />
            <StatsCard title="Variations" value={view.financials.variations.count} icon={FileText} subtitle={formatCurrency(view.financials.variations.totalAmount)} />
            <StatsCard title="Labour Cost" value={formatCurrency(view.financials.labour.totalLabourCost)} icon={Hammer} subtitle={`${view.financials.labour.regularHours}h regular / ${view.financials.labour.overtimeHours}h overtime`} />
            <StatsCard title="Material Cost" value={formatCurrency(view.financials.materials.totalCost)} icon={Package} subtitle={`${view.financials.materials.logs} logs`} />
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Project Team</CardTitle>
              <Button size="sm" onClick={() => setMemberModalOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Project Manager</p>
                {view.team.projectManager ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold">{view.team.projectManager.firstName} {view.team.projectManager.lastName}</p>
                    <p className="text-xs text-muted-foreground">{view.team.projectManager.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{view.team.projectManager.email}</p>
                    <p className="text-xs text-muted-foreground">{view.team.projectManager.phone}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No project manager assigned.</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Members ({view.team.membersCount})</p>
                {view.team.members.length === 0 ? (
                  <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">No team members assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {view.team.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{member.firstName[0]}{member.lastName[0] || ""}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                        <Button variant="outline" size="sm" onClick={() => void handleRemoveMember(member.userId)}>
                          <Trash2 className="mr-1 h-4 w-4" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setClockInModalOpen(true)}>
              <Timer className="mr-2 h-4 w-4" /> Clock In
            </Button>
            <Button variant="outline" disabled={!activeEntry} onClick={() => setClockOutModalOpen(true)}>
              <Timer className="mr-2 h-4 w-4" /> Clock Out
            </Button>
            <Button variant="outline" onClick={() => setManualEntryModalOpen(true)}>Manual Entry</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Active Entry</CardTitle></CardHeader>
            <CardContent>
              {activeEntry ? (
                <div className="rounded-lg border p-3 text-sm">
                  <p><span className="text-muted-foreground">Clocked In:</span> {new Date(activeEntry.clockInAt).toLocaleString()}</p>
                  <p><span className="text-muted-foreground">Task ID:</span> {activeEntry.taskId || "-"}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active time entry.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Entries</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time entries found for this project.</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{entry.user?.firstName || "User"} {entry.user?.lastName || ""}</p>
                      <p className="text-xs text-muted-foreground">{new Date(entry.clockInAt).toLocaleString()} {entry.clockOutAt ? `- ${new Date(entry.clockOutAt).toLocaleString()}` : "(active)"}</p>
                      <p className="text-xs text-muted-foreground">Status: {entry.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void handleApproveTimeEntry(entry.id, "APPROVED")}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => void handleApproveTimeEntry(entry.id, "REJECTED")}>Reject</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Weekly Summary</CardTitle></CardHeader>
            <CardContent>
              {weeklySummary ? (
                <div className="space-y-2">
                  <p className="text-sm"><span className="text-muted-foreground">Week Start:</span> {weeklySummary.weekStart}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Total Hours:</span> {weeklySummary.totalHours}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No weekly summary available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={quoteModalOpen} onOpenChange={setQuoteModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Quote</DialogTitle>
            <DialogDescription>Create a quote linked to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title</Label><Input value={quoteTitle} onChange={(e) => setQuoteTitle(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Issue Date</Label><Input type="date" value={quoteIssueDate} onChange={(e) => setQuoteIssueDate(e.target.value)} /></div>
              <div className="space-y-1"><Label>Expiry Date</Label><Input type="date" value={quoteExpiryDate} onChange={(e) => setQuoteExpiryDate(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Line Description</Label><Input value={quoteLineDescription} onChange={(e) => setQuoteLineDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={quoteLineQty} onChange={(e) => setQuoteLineQty(e.target.value)} /></div>
              <div className="space-y-1"><Label>Unit Price</Label><Input type="number" value={quoteLineUnitPrice} onChange={(e) => setQuoteLineUnitPrice(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreateQuote()}>Create Quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Create an invoice linked to this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Issue Date</Label><Input type="date" value={invoiceIssueDate} onChange={(e) => setInvoiceIssueDate(e.target.value)} /></div>
              <div className="space-y-1"><Label>Due Date</Label><Input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Line Description</Label><Input value={invoiceDescription} onChange={(e) => setInvoiceDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={invoiceQty} onChange={(e) => setInvoiceQty(e.target.value)} /></div>
              <div className="space-y-1"><Label>Unit Price</Label><Input type="number" value={invoiceUnitPrice} onChange={(e) => setInvoiceUnitPrice(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreateInvoice()}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add user to this project team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>User</Label>
              <Select value={memberUserId} onValueChange={(v: string | null) => setMemberUserId(v || "")}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Role</Label><Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAddMember()} disabled={!memberUserId}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clockInModalOpen} onOpenChange={setClockInModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
            <DialogDescription>Start a time entry for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Task ID (optional)</Label><Input value={clockInTaskId} onChange={(e) => setClockInTaskId(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>GPS Lat</Label><Input value={clockInLat} onChange={(e) => setClockInLat(e.target.value)} /></div>
              <div className="space-y-1"><Label>GPS Lng</Label><Input value={clockInLng} onChange={(e) => setClockInLng(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockInModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleClockIn()}>Clock In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clockOutModalOpen} onOpenChange={setClockOutModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock Out</DialogTitle>
            <DialogDescription>Complete your active time entry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Break Minutes</Label><Input type="number" value={clockOutBreakMinutes} onChange={(e) => setClockOutBreakMinutes(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>GPS Lat</Label><Input value={clockOutLat} onChange={(e) => setClockOutLat(e.target.value)} /></div>
              <div className="space-y-1"><Label>GPS Lng</Label><Input value={clockOutLng} onChange={(e) => setClockOutLng(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockOutModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleClockOut()} disabled={!activeEntry}>Clock Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualEntryModalOpen} onOpenChange={setManualEntryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Time Entry</DialogTitle>
            <DialogDescription>Create a manual entry (pending approval).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Task ID (optional)</Label><Input value={manualTaskId} onChange={(e) => setManualTaskId(e.target.value)} /></div>
            <div className="space-y-1"><Label>Clock In At</Label><Input type="datetime-local" value={manualClockInAt} onChange={(e) => setManualClockInAt(e.target.value)} /></div>
            <div className="space-y-1"><Label>Clock Out At</Label><Input type="datetime-local" value={manualClockOutAt} onChange={(e) => setManualClockOutAt(e.target.value)} /></div>
            <div className="space-y-1"><Label>Break Minutes</Label><Input type="number" value={manualBreakMinutes} onChange={(e) => setManualBreakMinutes(e.target.value)} /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualEntryModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleManualEntry()}>Create Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
