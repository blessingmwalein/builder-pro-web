"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  CheckSquare,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  DollarSign,
  AlertTriangle,
  Upload,
  Users,
  FileText,
  Receipt,
  Package,
  Hammer,
  Plus,
  Trash2,
  Timer,
  Layers,
  GitPullRequest,
  Play,
  CheckCheck,
  ChevronRight,
  SkipForward,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { useRequirePermission } from "@/lib/use-require-permission";
import { FEATURE_PERMS } from "@/lib/permissions";
import { Can } from "@/components/shared/can";
import api from "@/lib/api";
import {
  fetchProjectDashboard,
  fetchProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "@/store/slices/projectsSlice";
import { fetchQuotes } from "@/store/slices/quotesSlice";
import { fetchInvoices } from "@/store/slices/invoicesSlice";
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
import { DatePickerField } from "@/components/shared/date-picker-field";
import { BudgetEditModal } from "@/components/financials/budget-edit-modal";
import { UnexpectedCostModal } from "@/components/financials/unexpected-cost-modal";
import { BudgetCategoryLedgerModal } from "@/components/financials/budget-category-ledger-modal";
import { CloseProjectModal } from "@/components/projects/close-project-modal";
import { GanttChart } from "@/components/shared/gantt-chart";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskSheet } from "@/components/tasks/task-sheet";
import { searchAddresses, type AddressResult } from "@/lib/geocoding";
import { fetchProjectBudget, fetchProjectTransactions } from "@/store/slices/financialsSlice";

import type { Task, User as AppUser, PaginatedResponse, MaterialUsageLog } from "@/types";

type ProjectStage = {
  id: string;
  workflowCode: string;
  stageName: string;
  stageOrder: number;
  status: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  requiresApproval: boolean;
  approvedBy: { firstName: string; lastName: string } | null;
  approvedAt: string | null;
  notes: string | null;
};

type ChangeRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  type: string;
  status: string;
  requestedBy: { firstName: string; lastName: string };
  estimatedCost: number | null;
  approvedCost: number | null;
  createdAt: string;
  _count: { items: number };
};

type ProjectDocument = {
  id: string;
  fileName: string;   // display name (custom name provided at upload)
  folder?: string;    // serving URL — stored here by the backend
  type: string;
  version: number;
  approvalStatus: string | null;
  approvedAt: string | null;
  isRequired: boolean;
  stageId: string | null;
  createdAt: string;
};

type AnalyticsData = {
  budgetPerformance: { category: string; planned: number; actual: number; variance: number }[];
  taskCompletion: { stageCode: string; total: number; done: number; overdue: number }[];
  timeline: { stageCode: string; stageName: string; plannedDays: number; actualDays: number; delay: number; status: string }[];
  materialUsage: { material: string; actual: number }[];
  teamProductivity: { member: string; hoursLogged: number; tasksCompleted: number }[];
  profitability: { revenue: number; cost: number; margin: number; marginPct: number };
};

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
  useRequirePermission(FEATURE_PERMS.projects);
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const projectId = params.id as string;

  const { dashboard, members } = useAppSelector((s) => s.projects);
  const { entries, activeEntry, weeklySummary } = useAppSelector((s) => s.timeTracking);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [unexpectedCostOpen, setUnexpectedCostOpen] = useState(false);
  const [closeProjectOpen, setCloseProjectOpen] = useState(false);
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const [manualEntryModalOpen, setManualEntryModalOpen] = useState(false);

  // Lifecycle / Timeline (stages)
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stageSaving, setStageSaving] = useState<string | null>(null);
  const [approveStageOpen, setApproveStageOpen] = useState(false);
  const [approveStageId, setApproveStageId] = useState<string | null>(null);
  const [approveStageNotes, setApproveStageNotes] = useState("");
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [stageSubTab, setStageSubTab] = useState<Record<string, string>>({});
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormStageId, setTaskFormStageId] = useState<string>("");
  const [taskFormTask, setTaskFormTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTaskId, setSheetTaskId] = useState<string | null>(null);
  const [stageTasks, setStageTasks] = useState<Record<string, Task[]>>({});
  const [stageTasksLoading, setStageTasksLoading] = useState<Record<string, boolean>>({});
  const [stageDocuments, setStageDocuments] = useState<Record<string, unknown[]>>({});
  const [stageDocsLoading, setStageDocsLoading] = useState<Record<string, boolean>>({});
  // Document upload modal
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docUploadStageId, setDocUploadStageId] = useState<string | null>(null);
  const [docUploadName, setDocUploadName] = useState("");
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  // Document view modal
  const [viewDoc, setViewDoc] = useState<ProjectDocument | null>(null);
  // Task stage filter
  const [taskStageFilter, setTaskStageFilter] = useState<string>("__all__");
  // Analytics
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Financials detail
  const [materialLogs, setMaterialLogs] = useState<MaterialUsageLog[]>([]);
  const [materialLogsLoading, setMaterialLogsLoading] = useState(false);

  // Change Requests
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [crLoading, setCrLoading] = useState(true);
  const [crSaving, setCrSaving] = useState<string | null>(null);
  const [createCrOpen, setCreateCrOpen] = useState(false);
  const [crTitle, setCrTitle] = useState("");
  const [crDescription, setCrDescription] = useState("");
  const [crType, setCrType] = useState("CLIENT_INITIATED");

  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("Site Supervisor");

  const [clockInTaskId, setClockInTaskId] = useState("");
  const [clockInLat, setClockInLat] = useState("");
  const [clockInLng, setClockInLng] = useState("");
  const [clockInAddressQuery, setClockInAddressQuery] = useState("");
  const [clockInAddressResults, setClockInAddressResults] = useState<AddressResult[]>([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const [clockOutBreakMinutes, setClockOutBreakMinutes] = useState("0");
  const [clockOutLat, setClockOutLat] = useState("");
  const [clockOutLng, setClockOutLng] = useState("");

  const [manualTaskId, setManualTaskId] = useState("");
  const [manualClockInAt, setManualClockInAt] = useState("");
  const [manualClockOutAt, setManualClockOutAt] = useState("");
  const [manualBreakMinutes, setManualBreakMinutes] = useState("30");
  const [manualNotes, setManualNotes] = useState("");

  const taskNameMap = useMemo(() => {
    return new Map(projectTasks.map((task) => [task.id, task.title]));
  }, [projectTasks]);

  const labourByPerson = useMemo(() => {
    const map = new Map<string, { name: string; hours: number; entryCount: number }>();
    for (const entry of entries) {
      const uid = entry.userId;
      const name = entry.user
        ? `${entry.user.firstName ?? ""} ${entry.user.lastName ?? ""}`.trim() || "Unknown"
        : "Unknown";
      const hours = entry.totalHours ?? 0;
      const existing = map.get(uid);
      if (existing) {
        existing.hours += hours;
        existing.entryCount += 1;
      } else {
        map.set(uid, { name, hours, entryCount: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [entries]);

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

    void api
      .get<PaginatedResponse<Task>>("/tasks", { projectId, limit: 50 })
      .then((res) => setProjectTasks(res.items))
      .catch(() => setProjectTasks([]));

    void api
      .get<ProjectStage[]>(`/projects/${projectId}/stages`)
      .then(setStages)
      .catch(() => setStages([]))
      .finally(() => setStagesLoading(false));

    void api
      .get<ChangeRequest[]>(`/projects/${projectId}/change-requests`)
      .then(setChangeRequests)
      .catch(() => setChangeRequests([]))
      .finally(() => setCrLoading(false));

    setMaterialLogsLoading(true);
    void api
      .get<PaginatedResponse<MaterialUsageLog>>("/materials/logs", { projectId, limit: 100 })
      .then((res) => setMaterialLogs(res.items))
      .catch(() => setMaterialLogs([]))
      .finally(() => setMaterialLogsLoading(false));
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

  async function refreshStages() {
    const updated = await api.get<ProjectStage[]>(`/projects/${projectId}/stages`).catch(() => []);
    setStages(updated);
  }

  async function loadStageTasks(stageId: string, force = false) {
    if (!force && stageTasks[stageId] !== undefined) return;
    setStageTasksLoading((prev) => ({ ...prev, [stageId]: true }));
    try {
      const res = await api.get<{ items: Task[] }>("/tasks", { projectId, stageId, limit: 50 });
      setStageTasks((prev) => ({ ...prev, [stageId]: res.items }));
    } catch {
      setStageTasks((prev) => ({ ...prev, [stageId]: [] }));
    } finally {
      setStageTasksLoading((prev) => ({ ...prev, [stageId]: false }));
    }
  }

  async function loadStageDocuments(stageId: string, force = false) {
    if (!force && stageDocuments[stageId] !== undefined) return;
    setStageDocsLoading((prev) => ({ ...prev, [stageId]: true }));
    try {
      const docs = await api.get<ProjectDocument[]>(`/projects/${projectId}/documents`, { stageId });
      setStageDocuments((prev) => ({ ...prev, [stageId]: docs }));
    } catch {
      setStageDocuments((prev) => ({ ...prev, [stageId]: [] }));
    } finally {
      setStageDocsLoading((prev) => ({ ...prev, [stageId]: false }));
    }
  }

  function openDocUploadModal(stageId: string) {
    setDocUploadStageId(stageId);
    setDocUploadName("");
    setDocUploadFile(null);
    setDocUploadOpen(true);
  }

  async function handleDocUploadSubmit() {
    if (!docUploadFile || !docUploadName.trim() || !docUploadStageId) return;
    setDocUploading(true);
    const formData = new FormData();
    formData.append("file", docUploadFile);
    formData.append("stageId", docUploadStageId);
    formData.append("name", docUploadName.trim());
    try {
      await api.postForm(`/projects/${projectId}/documents`, formData);
      toast.success("Document uploaded");
      setDocUploadOpen(false);
      void loadStageDocuments(docUploadStageId, true);
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setDocUploading(false);
    }
  }

  async function loadAnalytics() {
    if (analyticsData) return;
    setAnalyticsLoading(true);
    try {
      const data = await api.get<AnalyticsData>(`/projects/${projectId}/analytics`);
      setAnalyticsData(data);
    } catch { /* non-fatal */ }
    setAnalyticsLoading(false);
  }

  function toggleStageExpand(stageId: string) {
    const opening = expandedStageId !== stageId;
    setExpandedStageId(opening ? stageId : null);
    if (opening) {
      void loadStageTasks(stageId);
      void loadStageDocuments(stageId);
    }
  }

  function openStageTaskCreate(stageId: string) {
    setTaskFormTask(null);
    setTaskFormStageId(stageId);
    setTaskFormOpen(true);
  }

  function openTaskSheet(taskId: string) {
    setSheetTaskId(taskId);
    setSheetOpen(true);
  }

  async function handleStageStatusUpdate(stageId: string, status: string) {
    setStageSaving(stageId);
    try {
      await api.patch(`/projects/${projectId}/stages/${stageId}`, { status });
      await refreshStages();
    } finally {
      setStageSaving(null);
    }
  }

  async function handleStageApprove() {
    if (!approveStageId) return;
    setStageSaving(approveStageId);
    try {
      await api.post(`/projects/${projectId}/stages/${approveStageId}/approve`, { notes: approveStageNotes });
      await refreshStages();
      setApproveStageOpen(false);
      setApproveStageId(null);
      setApproveStageNotes("");
    } finally {
      setStageSaving(null);
    }
  }

  async function refreshChangeRequests() {
    const updated = await api.get<ChangeRequest[]>(`/projects/${projectId}/change-requests`).catch(() => []);
    setChangeRequests(updated);
  }

  async function handleCreateCr() {
    if (!crTitle || !crDescription) return;
    setCrSaving("create");
    try {
      await api.post(`/projects/${projectId}/change-requests`, { title: crTitle, description: crDescription, type: crType });
      await refreshChangeRequests();
      setCreateCrOpen(false);
      setCrTitle("");
      setCrDescription("");
      setCrType("CLIENT_INITIATED");
    } finally {
      setCrSaving(null);
    }
  }

  async function handleCrAction(crId: string, action: string, body?: Record<string, unknown>) {
    setCrSaving(crId);
    try {
      await api.post(`/projects/${projectId}/change-requests/${crId}/${action}`, body ?? {});
      await refreshChangeRequests();
    } finally {
      setCrSaving(null);
    }
  }

  async function refreshProjectData() {
    await dispatch(fetchProjectDashboard(projectId));
    await dispatch(fetchProjectMembers(projectId));
    await dispatch(fetchTimeEntries({ projectId, limit: 50 }));
    await dispatch(fetchActiveEntry());
    await dispatch(fetchWeeklySummary(getCurrentWeekStartISO()));
    const tasksRes = await api
      .get<PaginatedResponse<Task>>("/tasks", { projectId, limit: 50 })
      .catch(() => ({ items: [] as Task[] }));
    setProjectTasks(tasksRes.items ?? []);
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

  function captureCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClockInLat(String(position.coords.latitude));
        setClockInLng(String(position.coords.longitude));
      },
      () => {
        // Keep manual entry available when geolocation fails or is denied.
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSearchAddress() {
    if (!clockInAddressQuery.trim()) {
      setClockInAddressResults([]);
      return;
    }
    setIsResolvingAddress(true);
    try {
      const results = await searchAddresses(clockInAddressQuery);
      setClockInAddressResults(results);
    } catch {
      setClockInAddressResults([]);
    } finally {
      setIsResolvingAddress(false);
    }
  }

  function handleSelectAddress(result: AddressResult) {
    setClockInAddressQuery(result.label);
    setClockInLat(String(result.lat));
    setClockInLng(String(result.lng));
    setClockInAddressResults([]);
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
        {view.project.status !== "COMPLETED" && view.project.status !== "ARCHIVED" && (
          <Can anyOf={FEATURE_PERMS.projectsManage}>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              onClick={() => setCloseProjectOpen(true)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Close Project
            </Button>
          </Can>
        )}
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({stages.length})</TabsTrigger>
          <Can anyOf={FEATURE_PERMS.tasks}>
            <TabsTrigger value="tasks">Tasks ({view.tasks.total})</TabsTrigger>
          </Can>
          <Can anyOf={FEATURE_PERMS.financials}>
            <TabsTrigger value="budget">Budget</TabsTrigger>
          </Can>
          <Can anyOf={FEATURE_PERMS.financials}>
            <TabsTrigger value="financials">Financials</TabsTrigger>
          </Can>
          <Can anyOf={FEATURE_PERMS.financials}>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </Can>
          <Can anyOf={FEATURE_PERMS.projectsManage}>
            <TabsTrigger value="team">Team ({view.team.membersCount})</TabsTrigger>
          </Can>
          <Can anyOf={FEATURE_PERMS.timesheets}>
            <TabsTrigger value="time">Time Tracking</TabsTrigger>
          </Can>
          <Can anyOf={FEATURE_PERMS.quotes}>
            <TabsTrigger value="change-requests">Changes ({changeRequests.length})</TabsTrigger>
          </Can>
          <Can anyOf={FEATURE_PERMS.reports}>
            <TabsTrigger value="analytics" onClick={() => void loadAnalytics()}>Analytics</TabsTrigger>
          </Can>
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
          <Can anyOf={FEATURE_PERMS.tasks}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Task Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <GanttChart tasks={projectTasks} />
            </CardContent>
          </Card>

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

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Current Tasks</p>
                  {stages.length > 0 && (
                    <Select value={taskStageFilter} onValueChange={(v) => setTaskStageFilter(v && v !== "__none__" ? v : "__all__")}>
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue placeholder="All Stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Stages</SelectItem>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {[...stages].sort((a, b) => a.stageOrder - b.stageOrder).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.stageName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {projectTasks.filter((t) =>
                  taskStageFilter === "__all__" ? true :
                  taskStageFilter === "__none__" ? !t.stageId :
                  t.stageId === taskStageFilter
                ).length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No tasks for the selected filter.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {projectTasks.filter((t) =>
                      taskStageFilter === "__all__" ? true :
                      taskStageFilter === "__none__" ? !t.stageId :
                      t.stageId === taskStageFilter
                    ).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openTaskSheet(task.id)}
                        className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/60"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-semibold">{task.title}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {formatStatusLabel(task.status)}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {task.description || "No description provided."}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{task.priority} priority</span>
                          <span>Due {safeDate(task.dueDate)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </Can>
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <Can anyOf={FEATURE_PERMS.financials}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Budget Breakdown</CardTitle>
              <Button size="sm" onClick={() => setBudgetModalOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Edit Budget
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Baseline Budget</p><p className="text-lg font-bold">{formatCurrency(view.budget.baselineBudget)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Planned</p><p className="text-lg font-bold">{formatCurrency(view.budget.planned)}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Actual</p><p className="text-lg font-bold">{formatCurrency(view.budget.actual)}</p></div>
              </div>

              <BudgetBreakdownLines projectId={projectId} />
            </CardContent>
          </Card>
          </Can>
        </TabsContent>

        <TabsContent value="financials" className="mt-4 space-y-4">
          <Can anyOf={FEATURE_PERMS.financials}>

          {/* ── P&L Summary ─────────────────────────────────────────── */}
          {(() => {
            const totalRevenue = view.financials.invoices.totalAmount;
            const totalPaid = view.financials.invoices.paidAmount;
            const totalCosts = view.financials.materials.totalCost + view.financials.labour.totalLabourCost;
            const grossProfit = totalRevenue - totalCosts;
            const overheadBudget = view.budget.byCategory?.find((c) => String(c.category ?? "").toUpperCase().includes("OVERHEAD"))?.actual ?? 0;
            const netProfit = grossProfit - Number(overheadBudget);
            const margin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> P&amp;L Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { label: "Total Revenue (Invoiced)", value: totalRevenue, sub: `${formatCurrency(totalPaid)} collected`, color: "text-primary" },
                      { label: "Material Costs", value: -view.financials.materials.totalCost, sub: `${view.financials.materials.logs} usage logs`, color: "text-muted-foreground" },
                      { label: "Labour Costs", value: -view.financials.labour.totalLabourCost, sub: `${view.financials.labour.regularHours}h reg + ${view.financials.labour.overtimeHours}h OT`, color: "text-muted-foreground" },
                      { label: "Gross Profit", value: grossProfit, sub: `${margin}% margin`, color: grossProfit >= 0 ? "text-emerald-600" : "text-destructive", bold: true },
                      { label: "Outstanding Invoices", value: -view.financials.invoices.balanceAmount, sub: "Unpaid balance", color: "text-amber-600" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className={`text-sm ${row.bold ? "font-semibold" : ""}`}>{row.label}</p>
                          {row.sub && <p className="text-[11px] text-muted-foreground">{row.sub}</p>}
                        </div>
                        <p className={`font-semibold ${row.color}`}>{formatCurrency(Math.abs(row.value))}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/quotes/new?projectId=${projectId}`)}><Plus className="mr-2 h-4 w-4" /> Create Quote</Button>
            <Button variant="outline" onClick={() => router.push(`/quotes?projectId=${projectId}`)}>View Quotes</Button>
            <Button onClick={() => router.push(`/invoices/new?projectId=${projectId}`)}><Plus className="mr-2 h-4 w-4" /> Create Invoice</Button>
            <Button variant="outline" onClick={() => router.push(`/invoices?projectId=${projectId}`)}>View Invoices</Button>
            <Button
              variant="outline"
              className="border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
              onClick={() => setUnexpectedCostOpen(true)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" /> Record Unexpected Cost
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard title="Quotes" value={view.financials.quotes.count} icon={FileText} subtitle={formatCurrency(view.financials.quotes.totalAmount)} />
            <StatsCard title="Invoices" value={view.financials.invoices.count} icon={Receipt} subtitle={formatCurrency(view.financials.invoices.totalAmount)} />
            <StatsCard title="Invoice Balance" value={formatCurrency(view.financials.invoices.balanceAmount)} icon={DollarSign} subtitle={`Paid ${formatCurrency(view.financials.invoices.paidAmount)}`} />
            <StatsCard title="Variations" value={view.financials.variations.count} icon={FileText} subtitle={formatCurrency(view.financials.variations.totalAmount)} />
            <StatsCard title="Labour Cost" value={formatCurrency(view.financials.labour.totalLabourCost)} icon={Hammer} subtitle={`${view.financials.labour.regularHours}h regular / ${view.financials.labour.overtimeHours}h overtime`} />
            <StatsCard title="Material Cost" value={formatCurrency(view.financials.materials.totalCost)} icon={Package} subtitle={`${view.financials.materials.logs} logs`} />
          </div>

          {/* ── Materials Usage Line Items ─────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Materials Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {materialLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : materialLogs.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No material usage logged for this project.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Material</th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Unit Cost</th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Logged By</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {materialLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{log.material?.name ?? "—"}</p>
                              {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {Number(log.quantity).toLocaleString()} {log.material?.unit ?? ""}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {formatCurrency(Number(log.unitCost))}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {formatCurrency(Number(log.totalCost))}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {log.loggedBy ? `${log.loggedBy.firstName} ${log.loggedBy.lastName}`.trim() : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/30">
                          <td className="px-4 py-2.5 font-semibold" colSpan={3}>Total</td>
                          <td className="px-4 py-2.5 text-right font-bold text-primary">
                            {formatCurrency(materialLogs.reduce((s, l) => s + Number(l.totalCost), 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Labour Breakdown by Individual ────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hammer className="h-4 w-4 text-muted-foreground" />
                Labour by Individual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No time entries logged for this project.</p>
              ) : labourByPerson.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No labour data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Person</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Hours</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Entries</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {labourByPerson.map((person) => {
                        const totalHours = labourByPerson.reduce((s, p) => s + p.hours, 0);
                        const pct = totalHours > 0 ? Math.round((person.hours / totalHours) * 100) : 0;
                        return (
                          <tr key={person.name} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-medium">{person.name}</td>
                            <td className="px-4 py-2.5 text-right">
                              {Number(person.hours).toFixed(1)}h
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {person.entryCount}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-muted-foreground text-xs w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td className="px-4 py-2.5 font-semibold">Total</td>
                        <td className="px-4 py-2.5 text-right font-bold text-primary">
                          {labourByPerson.reduce((s, p) => s + p.hours, 0).toFixed(1)}h
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-muted-foreground">
                          {labourByPerson.reduce((s, p) => s + p.entryCount, 0)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          </Can>
        </TabsContent>

        {/* ── Transaction Ledger Tab ── */}
        <TabsContent value="transactions" className="mt-4">
          <Can anyOf={FEATURE_PERMS.financials}>
          <TransactionLedger projectId={projectId} />
          </Can>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Can anyOf={FEATURE_PERMS.projectsManage}>
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
          </Can>
        </TabsContent>

        <TabsContent value="time" className="mt-4 space-y-4">
          <Can anyOf={FEATURE_PERMS.timesheets}>
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
                  <p><span className="text-muted-foreground">Task:</span> {activeEntry.task?.title || (activeEntry.taskId ? taskNameMap.get(activeEntry.taskId) : "-") || "-"}</p>
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
          </Can>
        </TabsContent>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline" className="mt-4 space-y-3">
          {stagesLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : stages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No workflow stages yet</p>
              </CardContent>
            </Card>
          ) : (
            [...stages].sort((a, b) => a.stageOrder - b.stageOrder).map((stage) => {
              const isExpanded = expandedStageId === stage.id;
              const activeSubTab = stageSubTab[stage.id] ?? "tasks";
              const tasks = stageTasks[stage.id] ?? [];
              const docs = (stageDocuments[stage.id] ?? []) as ProjectDocument[];
              const tasksCount = tasks.length;
              const doneCount = tasks.filter((t) => t.status === "DONE").length;
              const completionPct = tasksCount > 0 ? Math.round((doneCount / tasksCount) * 100) : 0;

              const statusColors: Record<string, string> = {
                PENDING: "border-l-slate-400",
                IN_PROGRESS: "border-l-blue-500",
                COMPLETED: "border-l-green-500",
                BLOCKED: "border-l-red-500",
                SKIPPED: "border-l-gray-400",
              };
              const borderColor = statusColors[stage.status] ?? "border-l-slate-300";

              return (
                <div key={stage.id} className={`rounded-lg border border-l-4 ${borderColor} bg-card overflow-hidden`}>
                  {/* Stage header — clickable to expand */}
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => toggleStageExpand(stage.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{stage.stageName}</span>
                        <StatusBadge status={stage.status} />
                        {stage.requiresApproval && !stage.approvedAt && (
                          <Badge variant="outline" className="text-[10px]">Needs Approval</Badge>
                        )}
                        {stage.approvedAt && (
                          <Badge variant="secondary" className="text-[10px] text-green-700">Approved</Badge>
                        )}
                        {tasksCount > 0 && (
                          <span className="text-xs text-muted-foreground">{doneCount}/{tasksCount} tasks</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5">
                        {(stage.plannedStartDate || stage.plannedEndDate) && (
                          <p className="text-[11px] text-muted-foreground">
                            {safeDate(stage.plannedStartDate)} – {safeDate(stage.plannedEndDate)}
                          </p>
                        )}
                        {tasksCount > 0 && (
                          <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">{completionPct}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t bg-background">
                      {/* Sub-tab bar */}
                      <div className="flex border-b bg-muted/20">
                        {["tasks", "documents", "actions"].map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                              activeSubTab === tab
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => setStageSubTab((prev) => ({ ...prev, [stage.id]: tab }))}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Tasks sub-tab */}
                      {activeSubTab === "tasks" && (
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Stage Tasks</p>
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => openStageTaskCreate(stage.id)}>
                              <Plus className="h-3.5 w-3.5" /> New Task
                            </Button>
                          </div>
                          {stageTasksLoading[stage.id] ? (
                            <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
                          ) : tasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned to this stage yet.</p>
                          ) : (
                            tasks.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className="flex w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                                onClick={() => openTaskSheet(t.id)}
                              >
                                <div className={`h-2 w-2 rounded-full shrink-0 ${t.status === "DONE" ? "bg-green-500" : t.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-slate-300"}`} />
                                <span className={`flex-1 text-sm ${t.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                                <StatusBadge status={t.priority} />
                              </button>
                            ))
                          )}
                          <p className="text-xs text-muted-foreground pt-1">
                            Click a task to edit. Tasks can also be assigned to this stage from the Tasks tab.
                          </p>
                        </div>
                      )}

                      {/* Documents sub-tab */}
                      {activeSubTab === "documents" && (
                        <div className="p-4 space-y-2">
                          {stageDocsLoading[stage.id] ? (
                            <div className="space-y-1.5">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                          ) : docs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded for this stage yet.</p>
                          ) : (
                            docs.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                className="flex w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                                onClick={() => setViewDoc(doc)}
                              >
                                <FileText className="h-4 w-4 shrink-0 text-primary" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.fileName}</p>
                                  <p className="text-xs text-muted-foreground">v{doc.version} · {safeDate(doc.createdAt)}</p>
                                </div>
                                <Badge variant={doc.approvalStatus === "APPROVED" ? "default" : "secondary"} className="text-[10px]">
                                  {doc.approvalStatus ?? "pending"}
                                </Badge>
                                {doc.isRequired && <span className="text-destructive text-xs font-bold">*</span>}
                              </button>
                            ))
                          )}
                          <div className="pt-1">
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => openDocUploadModal(stage.id)}
                            >
                              <Upload className="mr-1 h-3 w-3" /> Upload Document
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Actions sub-tab */}
                      {activeSubTab === "actions" && (
                        <div className="p-4 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {stage.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={stageSaving === stage.id}
                                onClick={() => void handleStageStatusUpdate(stage.id, "IN_PROGRESS")}
                              >
                                {stageSaving === stage.id
                                  ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  : <Play className="mr-1 h-3.5 w-3.5" />}
                                Start Stage
                              </Button>
                            )}
                            {stage.status === "IN_PROGRESS" && !stage.requiresApproval && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={stageSaving === stage.id}
                                onClick={() => void handleStageStatusUpdate(stage.id, "COMPLETED")}
                              >
                                {stageSaving === stage.id
                                  ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  : <CheckCheck className="mr-1 h-3.5 w-3.5" />}
                                Complete Stage
                              </Button>
                            )}
                            {stage.status === "IN_PROGRESS" && stage.requiresApproval && (
                              <Button
                                size="sm"
                                disabled={stageSaving === stage.id}
                                onClick={() => { setApproveStageId(stage.id); setApproveStageOpen(true); }}
                              >
                                {stageSaving === stage.id
                                  ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                                Request Approval
                              </Button>
                            )}
                            {stage.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={stageSaving === stage.id}
                                onClick={() => void handleStageStatusUpdate(stage.id, "SKIPPED")}
                              >
                                {stageSaving === stage.id
                                  ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  : <SkipForward className="mr-1 h-3.5 w-3.5" />}
                                Skip Stage
                              </Button>
                            )}
                          </div>
                          {stage.notes && (
                            <p className="text-sm text-muted-foreground border rounded p-2">{stage.notes}</p>
                          )}
                          {stage.approvedBy && (
                            <p className="text-xs text-muted-foreground">
                              Approved by {stage.approvedBy.firstName} {stage.approvedBy.lastName} on {safeDate(stage.approvedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          <Can anyOf={FEATURE_PERMS.reports}>
          {analyticsLoading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
          ) : !analyticsData ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Click the Analytics tab to load project data.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Profitability summary */}
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: "Revenue", value: formatCurrency(analyticsData.profitability.revenue) },
                  { label: "Cost", value: formatCurrency(analyticsData.profitability.cost) },
                  { label: "Margin", value: formatCurrency(analyticsData.profitability.margin) },
                  { label: "Margin %", value: `${analyticsData.profitability.marginPct}%` },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardContent className="py-4 text-center">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold mt-1">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Budget performance chart */}
              {analyticsData.budgetPerformance.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Budget Performance</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analyticsData.budgetPerformance} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: unknown) => typeof v === "number" ? formatCurrency(v) : ""} />
                        <Legend />
                        <Bar dataKey="planned" name="Planned" fill="hsl(var(--primary))" opacity={0.7} />
                        <Bar dataKey="actual" name="Actual" fill="hsl(var(--destructive))" opacity={0.7} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Task completion by stage */}
              {analyticsData.taskCompletion.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" />Task Completion by Stage</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {analyticsData.taskCompletion.map((s) => {
                      const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                      return (
                        <div key={s.stageCode} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{s.stageCode.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground">{s.done}/{s.total} done{s.overdue > 0 ? ` · ${s.overdue} overdue` : ""}</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Stage timeline */}
              {analyticsData.timeline.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Stage Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData.timeline.map((s) => (
                        <div key={s.stageCode} className="flex items-center gap-3 text-sm">
                          <span className="w-40 shrink-0 text-xs truncate">{s.stageName}</span>
                          <StatusBadge status={s.status} />
                          <div className="flex-1 text-xs text-muted-foreground">
                            {s.plannedDays > 0 && <span>Planned {s.plannedDays}d</span>}
                            {s.actualDays > 0 && <span className="ml-2">Actual {s.actualDays}d</span>}
                            {s.delay > 0 && <span className="ml-2 text-destructive">+{s.delay}d delay</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team productivity */}
              {analyticsData.teamProductivity.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Team Productivity</CardTitle></CardHeader>
                  <CardContent>
                    <div className="divide-y">
                      {analyticsData.teamProductivity.map((member, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 text-sm">
                          <span className="flex-1 font-medium">{member.member}</span>
                          <span className="text-muted-foreground text-xs">{member.hoursLogged.toFixed(1)} hrs</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          </Can>
        </TabsContent>

        {/* ── Change Requests Tab ── */}
        <TabsContent value="change-requests" className="mt-4 space-y-4">
          <Can anyOf={FEATURE_PERMS.quotes}>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCreateCrOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New Change Request
            </Button>
          </div>

          {crLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : changeRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitPullRequest className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No change requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y pt-0">
                {changeRequests.map((cr) => (
                  <div key={cr.id} className="flex flex-wrap items-start gap-3 py-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{cr.requestNumber}</span>
                        <StatusBadge status={cr.status} />
                        <Badge variant="outline" className="text-[10px]">{cr.type.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-sm font-medium">{cr.title}</p>
                      <p className="text-xs text-muted-foreground">
                        By {cr.requestedBy?.firstName} {cr.requestedBy?.lastName} · {safeDate(cr.createdAt)}
                        {cr._count?.items > 0 && ` · ${cr._count.items} items`}
                        {cr.estimatedCost != null && ` · Est. ${formatCurrency(cr.estimatedCost)}`}
                        {cr.approvedCost != null && ` · Approved ${formatCurrency(cr.approvedCost)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cr.status === "DRAFT" && (
                        <Button size="sm" variant="outline" disabled={crSaving === cr.id} onClick={() => void handleCrAction(cr.id, "submit")}>
                          Submit
                        </Button>
                      )}
                      {cr.status === "SUBMITTED" && (
                        <Button size="sm" variant="outline" disabled={crSaving === cr.id} onClick={() => void handleCrAction(cr.id, "review")}>
                          Start Review
                        </Button>
                      )}
                      {cr.status === "UNDER_REVIEW" && (
                        <>
                          <Button size="sm" disabled={crSaving === cr.id} onClick={() => void handleCrAction(cr.id, "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" disabled={crSaving === cr.id} onClick={() => void handleCrAction(cr.id, "reject", { rejectionNotes: "Rejected" })}>
                            Reject
                          </Button>
                        </>
                      )}
                      {cr.status === "APPROVED" && (
                        <Button size="sm" variant="outline" disabled={crSaving === cr.id} onClick={() => void handleCrAction(cr.id, "implement")}>
                          <CheckCheck className="mr-1 h-3.5 w-3.5" /> Implement
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          </Can>
        </TabsContent>
      </Tabs>

      {/* Stage Approval Dialog */}
      <Dialog open={approveStageOpen} onOpenChange={setApproveStageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Stage</DialogTitle>
            <DialogDescription>Confirm completion and approval for this stage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Approval Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this approval..."
                value={approveStageNotes}
                onChange={(e) => setApproveStageNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveStageOpen(false)}>Cancel</Button>
            <Button disabled={!!stageSaving} onClick={() => void handleStageApprove()}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Approve Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Change Request Dialog */}
      <Dialog open={createCrOpen} onOpenChange={setCreateCrOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Change Request</DialogTitle>
            <DialogDescription>Describe the change needed for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input placeholder="e.g. Extend foundation by 2m" value={crTitle} onChange={(e) => setCrTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea placeholder="Detailed description of the change..." value={crDescription} onChange={(e) => setCrDescription(e.target.value)} rows={4} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={crType} onValueChange={(v) => v && setCrType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT_INITIATED">Client Initiated</SelectItem>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="DESIGN_CHANGE">Design Change</SelectItem>
                  <SelectItem value="SCOPE_CHANGE">Scope Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCrOpen(false)}>Cancel</Button>
            <Button disabled={crSaving === "create" || !crTitle || !crDescription} onClick={() => void handleCreateCr()}>
              Create Change Request
            </Button>
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
            <div className="space-y-1">
              <Label>Current Task (optional)</Label>
              <Select value={clockInTaskId || "NONE"} onValueChange={(value: string | null) => setClockInTaskId(value === "NONE" || value == null ? "" : value)}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No task</SelectItem>
                  {projectTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Address Search</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search address"
                  value={clockInAddressQuery}
                  onChange={(e) => setClockInAddressQuery(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => void handleSearchAddress()} disabled={isResolvingAddress}>
                  {isResolvingAddress ? "Searching..." : "Search"}
                </Button>
              </div>
              {clockInAddressResults.length > 0 && (
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                  {clockInAddressResults.map((result) => (
                    <button
                      key={`${result.lat}-${result.lng}-${result.label}`}
                      type="button"
                      onClick={() => handleSelectAddress(result)}
                      className="w-full rounded-md p-2 text-left text-xs hover:bg-muted"
                    >
                      {result.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="outline" onClick={captureCurrentLocation}>Use Current Location</Button>
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
            <div className="space-y-1">
              <Label>Task (optional)</Label>
              <Select value={manualTaskId || "NONE"} onValueChange={(value: string | null) => setManualTaskId(value === "NONE" || value == null ? "" : value)}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No task</SelectItem>
                  {projectTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      <BudgetEditModal
        open={budgetModalOpen}
        onOpenChange={setBudgetModalOpen}
        projectId={projectId}
      />

      <UnexpectedCostModal
        open={unexpectedCostOpen}
        onOpenChange={setUnexpectedCostOpen}
        projectId={projectId}
        onSaved={() => {
          void dispatch(fetchProjectDashboard(projectId));
        }}
      />

      <CloseProjectModal
        open={closeProjectOpen}
        onOpenChange={setCloseProjectOpen}
        projectId={projectId}
        onClosed={() => {
          void dispatch(fetchProjectDashboard(projectId));
        }}
      />

      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open);
          if (!open) { setTaskFormTask(null); setTaskFormStageId(""); }
        }}
        defaultProjectId={projectId}
        defaultStageId={taskFormStageId}
        task={taskFormTask}
        onSuccess={async () => {
          void api.get<PaginatedResponse<Task>>("/tasks", { projectId, limit: 50 })
            .then((res) => setProjectTasks(res.items))
            .catch(() => {});
          if (taskFormStageId) {
            void loadStageTasks(taskFormStageId, true);
          }
        }}
      />

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        taskId={sheetTaskId}
        onRefresh={async () => {
          void api.get<PaginatedResponse<Task>>("/tasks", { projectId, limit: 50 })
            .then((res) => setProjectTasks(res.items))
            .catch(() => {});
        }}
      />

      {/* Document Upload Modal */}
      <Dialog open={docUploadOpen} onOpenChange={(open) => { setDocUploadOpen(open); if (!open) setDocUploadFile(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>PDF files only. Provide a name for this document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Document Name</Label>
              <Input
                placeholder="e.g. Foundation Inspection Report"
                value={docUploadName}
                onChange={(e) => setDocUploadName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>PDF File</Label>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                onClick={() => document.getElementById("doc-file-input")?.click()}
              >
                {docUploadFile ? (
                  <>
                    <FileText className="mb-2 h-8 w-8 text-primary" />
                    <p className="text-sm font-medium truncate max-w-[240px]">{docUploadFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{(docUploadFile.size / 1024).toFixed(0)} KB</p>
                    <button
                      type="button"
                      className="mt-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDocUploadFile(null); }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Click to select PDF</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PDF files only, up to 20 MB</p>
                  </>
                )}
              </div>
              <input
                id="doc-file-input"
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setDocUploadFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocUploadOpen(false)}>Cancel</Button>
            <Button
              disabled={!docUploadFile || !docUploadName.trim() || docUploading}
              onClick={() => void handleDocUploadSubmit()}
            >
              {docUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document View Modal */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null); }}>
        <DialogContent className="sm:max-w-5xl h-[95vh] flex flex-col">
          {(() => {
            const docUrl = viewDoc?.folder;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {viewDoc?.fileName}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-3 text-xs">
                    <span>Version {viewDoc?.version}</span>
                    <span>·</span>
                    <span>Uploaded {safeDate(viewDoc?.createdAt)}</span>
                    {viewDoc?.approvalStatus && (
                      <>
                        <span>·</span>
                        <Badge variant={viewDoc.approvalStatus === "APPROVED" ? "default" : "secondary"} className="text-[10px]">
                          {viewDoc.approvalStatus}
                        </Badge>
                      </>
                    )}
                    {viewDoc?.isRequired && <span className="text-destructive font-semibold">Required</span>}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden rounded-lg border bg-muted/20 min-h-0">
                  {docUrl ? (
                    <iframe
                      src={docUrl}
                      className="h-full w-full rounded-lg"
                      title={viewDoc?.fileName}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                      <FileText className="h-12 w-12 opacity-30" />
                      <p className="text-sm">Document URL not available</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  {docUrl && (
                    <a href={docUrl} download={viewDoc?.fileName} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4 rotate-180" /> Download
                      </Button>
                    </a>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setViewDoc(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetBreakdownLines({ projectId }: { projectId: string }) {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { projectBudget } = useAppSelector((s) => s.financials);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    void dispatch(fetchProjectBudget(projectId));
  }, [dispatch, projectId]);

  const lines = projectBudget?.lines ?? [];
  if (lines.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No per-category budget yet. Click &ldquo;Edit Budget&rdquo; to allocate
        planned spend by category.
      </p>
    );
  }

  function statusBadge(status?: string) {
    if (status === "OVER_BUDGET") return <Badge variant="destructive" className="text-[10px]">Over Budget</Badge>;
    if (status === "WARNING") return <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Warning</Badge>;
    return <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">On Track</Badge>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Planned</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Actual</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Remaining</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Variance</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Used</th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map((line) => {
              const remaining = line.plannedAmount - line.actualAmount;
              const pct = line.percentUsed ?? (line.plannedAmount > 0 ? Math.round((line.actualAmount / line.plannedAmount) * 100) : 0);
              const varColor = line.variance < 0 ? "text-destructive" : "text-emerald-600";
              return (
                <tr
                  key={line.categoryId}
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => { setSelectedCategory({ id: line.categoryId, name: line.categoryName }); setLedgerOpen(true); }}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{line.categoryName}</p>
                    <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : pct >= (line.thresholdPct || 80) ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(line.plannedAmount)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(line.actualAmount)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{formatCurrency(Math.max(remaining, 0))}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${varColor}`}>{formatCurrency(line.variance)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{pct}%</td>
                  <td className="px-3 py-2.5 text-center">{statusBadge(line.status)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td className="px-3 py-2.5 font-semibold">Total</td>
              <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(projectBudget?.totalBudget ?? 0)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-primary">{formatCurrency(projectBudget?.totalSpent ?? 0)}</td>
              <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(Math.max((projectBudget?.totalBudget ?? 0) - (projectBudget?.totalSpent ?? 0), 0))}</td>
              <td className={`px-3 py-2.5 text-right font-bold ${(projectBudget?.totalBudget ?? 0) < (projectBudget?.totalSpent ?? 0) ? "text-destructive" : "text-emerald-600"}`}>
                {formatCurrency((projectBudget?.totalBudget ?? 0) - (projectBudget?.totalSpent ?? 0))}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold">{projectBudget?.percentUsed ?? 0}%</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">Click any category row to view its full financial ledger.</p>

      {selectedCategory && (
        <BudgetCategoryLedgerModal
          open={ledgerOpen}
          onOpenChange={setLedgerOpen}
          projectId={projectId}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
        />
      )}
    </>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual Entry",
  MATERIAL: "Material Purchase",
  LABOUR: "Labour",
  EQUIPMENT: "Equipment",
  OVERHEAD: "Overhead",
  TRANSPORT: "Transport",
  UNEXPECTED: "Unexpected Cost",
  OTHER: "Other",
};

function TransactionLedger({ projectId }: { projectId: string }) {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { transactions, transactionsTotal } = useAppSelector((s) => s.financials);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    void dispatch(fetchProjectTransactions({ projectId, page, limit }));
  }, [dispatch, projectId, page]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Transaction Ledger
        </CardTitle>
        <span className="text-xs text-muted-foreground">{transactionsTotal} total</span>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No transactions recorded yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Source</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Vendor</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Ref</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(tx.occurredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <p>{tx.description}</p>
                        {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{tx.category?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {SOURCE_LABELS[tx.sourceType] ?? tx.sourceType}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{tx.vendor ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{tx.reference ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(Number(tx.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactionsTotal > limit && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {Math.ceil(transactionsTotal / limit)}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(transactionsTotal / limit)} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
