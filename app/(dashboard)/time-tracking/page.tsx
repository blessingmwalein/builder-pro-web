"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Play, Square, Check, X, Timer, ClipboardCheck, CalendarClock } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import api from "@/lib/api";
import {
  fetchTimeEntries,
  fetchActiveEntry,
  fetchWeeklySummary,
  clockIn,
  clockOut,
  approveTimeEntry,
  createManualTimeEntry,
} from "@/store/slices/timeTrackingSlice";
import type { Task, TimeEntry, PaginatedResponse } from "@/types";
import { searchAddresses, type AddressResult } from "@/lib/geocoding";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;
const APPROVAL_PAGE_SIZE = 10;

type ProjectOption = {
  id: string;
  name: string;
  status?: string;
  isArchived?: boolean;
  deletedAt?: string | null;
};

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatElapsed(startTime: string): string {
  const diff = Math.max(0, Date.now() - new Date(startTime).getTime());
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "--";
  const d = new Date(value);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function getWeekStart(date = new Date()): string {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next.toISOString().slice(0, 10);
}

function nowLocalInput(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TimeTrackingPage() {
  const dispatch = useAppDispatch();
  const { entries, total, activeEntry, weeklySummary, isLoading } = useAppSelector((s) => s.timeTracking);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);

  const [activeTab, setActiveTab] = useState("entries");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const [clockProjectId, setClockProjectId] = useState("");
  const [clockTaskId, setClockTaskId] = useState("");
  const [clockInLat, setClockInLat] = useState("");
  const [clockInLng, setClockInLng] = useState("");
  const [clockInAddressQuery, setClockInAddressQuery] = useState("");
  const [clockInAddressResults, setClockInAddressResults] = useState<AddressResult[]>([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const [clockOutBreakMinutes, setClockOutBreakMinutes] = useState("0");
  const [clockOutLat, setClockOutLat] = useState("");
  const [clockOutLng, setClockOutLng] = useState("");

  const [manualProjectId, setManualProjectId] = useState("");
  const [manualTaskId, setManualTaskId] = useState("");
  const [manualClockInAt, setManualClockInAt] = useState(nowLocalInput());
  const [manualClockOutAt, setManualClockOutAt] = useState(nowLocalInput());
  const [manualBreakMinutes, setManualBreakMinutes] = useState("0");
  const [manualNotes, setManualNotes] = useState("");

  const [clockTasks, setClockTasks] = useState<Task[]>([]);
  const [manualTasks, setManualTasks] = useState<Task[]>([]);

  const [elapsed, setElapsed] = useState("00:00:00");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [pendingEntries, setPendingEntries] = useState<TimeEntry[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});

  const selectableProjects = useMemo(
    () =>
      projectOptions.filter(
        (project) =>
          !project.isArchived &&
          !project.deletedAt &&
          ["DRAFT", "ACTIVE", "ON_HOLD"].includes((project.status || "ACTIVE").toUpperCase())
      ),
    [projectOptions]
  );

  useEffect(() => {
    dispatch(fetchActiveEntry());
    dispatch(fetchWeeklySummary(getWeekStart()));

    void api
      .get<PaginatedResponse<ProjectOption>>("/projects", { page: 1, limit: 100 })
      .then((response) => {
        setProjectOptions(Array.isArray(response.items) ? response.items : []);
      })
      .catch(() => setProjectOptions([]));
  }, [dispatch]);

  useEffect(() => {
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    if (projectFilter) params.projectId = projectFilter;
    dispatch(fetchTimeEntries(params));
  }, [dispatch, page, projectFilter, statusFilter]);

  useEffect(() => {
    if (!activeEntry) {
      setElapsed("00:00:00");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => setElapsed(formatElapsed(activeEntry.clockInAt));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeEntry]);

  useEffect(() => {
    if (!selectableProjects.length) return;
    if (!clockProjectId || !selectableProjects.some((project) => project.id === clockProjectId)) {
      setClockProjectId(selectableProjects[0].id);
    }
    if (!manualProjectId || !selectableProjects.some((project) => project.id === manualProjectId)) {
      setManualProjectId(selectableProjects[0].id);
    }
  }, [selectableProjects, clockProjectId, manualProjectId]);

  useEffect(() => {
    if (!clockProjectId) {
      setClockTasks([]);
      return;
    }

    void api
      .get<PaginatedResponse<Task>>("/tasks", { projectId: clockProjectId, page: 1, limit: 100 })
      .then((res) => setClockTasks(res.items))
      .catch(() => setClockTasks([]));
  }, [clockProjectId]);

  useEffect(() => {
    if (!manualProjectId) {
      setManualTasks([]);
      return;
    }

    void api
      .get<PaginatedResponse<Task>>("/tasks", { projectId: manualProjectId, page: 1, limit: 100 })
      .then((res) => setManualTasks(res.items))
      .catch(() => setManualTasks([]));
  }, [manualProjectId]);

  useEffect(() => {
    if (activeTab !== "approvals") return;
    setPendingLoading(true);
    void api
      .get<PaginatedResponse<TimeEntry>>("/time-tracking", {
        status: "PENDING",
        page: pendingPage,
        limit: APPROVAL_PAGE_SIZE,
      })
      .then((res) => {
        setPendingEntries(res.items);
        setPendingTotal(res.meta.total);
      })
      .catch(() => {
        setPendingEntries([]);
        setPendingTotal(0);
      })
      .finally(() => setPendingLoading(false));
  }, [activeTab, pendingPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotal / APPROVAL_PAGE_SIZE));

  const todayHours = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return entries
      .filter((entry) => entry.clockInAt.slice(0, 10) === today)
      .reduce((sum, entry) => sum + (entry.totalHours ?? 0), 0);
  }, [entries]);

  const refreshAfterMutation = () => {
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    if (projectFilter) params.projectId = projectFilter;
    dispatch(fetchActiveEntry());
    dispatch(fetchTimeEntries(params));
    dispatch(fetchWeeklySummary(getWeekStart()));
    if (activeTab === "approvals") {
      setPendingPage(1);
    }
  };

  const handleClockIn = async () => {
    if (!clockProjectId) return;
    await dispatch(
      clockIn({
        projectId: clockProjectId,
        taskId: clockTaskId || undefined,
        gpsInLat: toNumber(clockInLat),
        gpsInLng: toNumber(clockInLng),
      })
    ).unwrap();
    refreshAfterMutation();
  };

  const captureCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClockInLat(String(position.coords.latitude));
        setClockInLng(String(position.coords.longitude));
      },
      () => {
        // Keep manual fields available if denied or unavailable.
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchAddress = async () => {
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
  };

  const handleSelectAddress = (result: AddressResult) => {
    setClockInAddressQuery(result.label);
    setClockInLat(String(result.lat));
    setClockInLng(String(result.lng));
    setClockInAddressResults([]);
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    await dispatch(
      clockOut({
        entryId: activeEntry.id,
        data: {
          breakMinutes: Number(clockOutBreakMinutes || 0),
          gpsOutLat: toNumber(clockOutLat),
          gpsOutLng: toNumber(clockOutLng),
        },
      })
    ).unwrap();
    setClockOutBreakMinutes("0");
    setClockOutLat("");
    setClockOutLng("");
    refreshAfterMutation();
  };

  const handleManualEntry = async () => {
    if (!manualProjectId || !manualClockInAt || !manualClockOutAt) return;
    await dispatch(
      createManualTimeEntry({
        projectId: manualProjectId,
        taskId: manualTaskId || undefined,
        clockInAt: new Date(manualClockInAt).toISOString(),
        clockOutAt: new Date(manualClockOutAt).toISOString(),
        breakMinutes: Number(manualBreakMinutes || 0),
        notes: manualNotes.trim() || undefined,
      })
    ).unwrap();

    setManualTaskId("");
    setManualBreakMinutes("0");
    setManualNotes("");
    setManualClockInAt(nowLocalInput());
    setManualClockOutAt(nowLocalInput());
    refreshAfterMutation();
  };

  const handleApproval = async (entryId: string, status: "APPROVED" | "REJECTED") => {
    await dispatch(
      approveTimeEntry({
        entryId,
        status,
        comment: approvalComments[entryId]?.trim() || undefined,
      })
    ).unwrap();

    setApprovalComments((prev) => ({ ...prev, [entryId]: "" }));
    setPendingEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    setPendingTotal((prev) => Math.max(0, prev - 1));
    dispatch(fetchTimeEntries({ page, limit: PAGE_SIZE, ...(projectFilter ? { projectId: projectFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}) }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Time Tracking" description="Clock tasks, submit manual entries, and approve team timesheets." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Timer</p>
            <p className="mt-1 text-2xl font-bold font-mono">{activeEntry ? elapsed : "00:00:00"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Today Hours</p>
            <p className="mt-1 text-2xl font-bold">{todayHours.toFixed(2)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="mt-1 text-2xl font-bold">{(weeklySummary?.totalHours ?? 0).toFixed(2)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Approvals</p>
            <p className="mt-1 text-2xl font-bold">{pendingTotal}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={activeEntry ? "border-emerald-300" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {activeEntry ? <Timer className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4" />}
            {activeEntry ? "Clock Out" : "Clock In"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeEntry ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Active entry: <span className="font-medium text-foreground">{activeEntry.project?.name || "Project"}</span>
                {activeEntry.task?.title ? ` - ${activeEntry.task.title}` : ""}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Break Minutes</Label>
                  <Input type="number" min="0" value={clockOutBreakMinutes} onChange={(e) => setClockOutBreakMinutes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>GPS Out Latitude</Label>
                  <Input value={clockOutLat} onChange={(e) => setClockOutLat(e.target.value)} placeholder="-17.8292" />
                </div>
                <div className="space-y-2">
                  <Label>GPS Out Longitude</Label>
                  <Input value={clockOutLng} onChange={(e) => setClockOutLng(e.target.value)} placeholder="31.0522" />
                </div>
              </div>
              <Button className="gap-2" variant="destructive" onClick={handleClockOut}>
                <Square className="h-4 w-4" /> Clock Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={clockProjectId} onValueChange={(value) => setClockProjectId(value ?? "") }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task (Optional)</Label>
                  <Select value={clockTaskId || "ALL"} onValueChange={(value) => setClockTaskId(value === "ALL" || value == null ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">No task</SelectItem>
                      {clockTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>GPS In Latitude</Label>
                  <Input value={clockInLat} onChange={(e) => setClockInLat(e.target.value)} placeholder="-17.8292" />
                </div>
                <div className="space-y-2">
                  <Label>GPS In Longitude</Label>
                  <Input value={clockInLng} onChange={(e) => setClockInLng(e.target.value)} placeholder="31.0522" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address Search</Label>
                <div className="flex gap-2">
                  <Input
                    value={clockInAddressQuery}
                    onChange={(e) => setClockInAddressQuery(e.target.value)}
                    placeholder="Search location"
                  />
                  <Button type="button" variant="outline" onClick={() => void handleSearchAddress()} disabled={isResolvingAddress}>
                    {isResolvingAddress ? "Searching..." : "Search"}
                  </Button>
                  <Button type="button" variant="outline" onClick={captureCurrentLocation}>Use GPS</Button>
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

              <Button className="gap-2" onClick={handleClockIn} disabled={!clockProjectId}>
                <Play className="h-4 w-4" /> Clock In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value ?? "entries")}>
        <TabsList>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4 pt-4">
          <Card>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={statusFilter || "ALL"}
                  onValueChange={(value) => {
                    setStatusFilter(value === "ALL" || value == null ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={projectFilter || "ALL"}
                  onValueChange={(value) => {
                    setProjectFilter(value === "ALL" || value == null ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All projects</SelectItem>
                    {selectableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Week</Label>
                <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => dispatch(fetchWeeklySummary(getWeekStart()))}>
                  <CalendarClock className="h-4 w-4" /> Refresh Weekly Summary
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Project / Task</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.clockInAt).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "--"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.project?.name || "--"}</p>
                          <p className="text-xs text-muted-foreground">{entry.task?.title || "No task"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(entry.clockInAt)}</TableCell>
                      <TableCell>{formatDateTime(entry.clockOutAt)}</TableCell>
                      <TableCell className="text-right">{(entry.totalHours ?? 0).toFixed(2)}</TableCell>
                      <TableCell><StatusBadge status={entry.status} /></TableCell>
                    </TableRow>
                  ))}
                  {!entries.length && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">No time entries found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Manual Time Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={manualProjectId} onValueChange={(value) => setManualProjectId(value ?? "") }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Task (Optional)</Label>
                  <Select value={manualTaskId || "ALL"} onValueChange={(value) => setManualTaskId(value === "ALL" || value == null ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">No task</SelectItem>
                      {manualTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Clock In At</Label>
                  <Input type="datetime-local" value={manualClockInAt} onChange={(e) => setManualClockInAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Clock Out At</Label>
                  <Input type="datetime-local" value={manualClockOutAt} onChange={(e) => setManualClockOutAt(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Break Minutes</Label>
                  <Input type="number" min="0" value={manualBreakMinutes} onChange={(e) => setManualBreakMinutes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Overtime, travel, or correction notes" />
                </div>
              </div>

              <Button className="gap-2" onClick={handleManualEntry} disabled={!manualProjectId || !manualClockInAt || !manualClockOutAt}>
                <ClipboardCheck className="h-4 w-4" /> Save Manual Entry
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Project / Task</TableHead>
                    <TableHead>Worked</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "--"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.project?.name || "--"}</p>
                          <p className="text-xs text-muted-foreground">{entry.task?.title || "No task"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{(entry.totalHours ?? 0).toFixed(2)}h</TableCell>
                      <TableCell>
                        <Input
                          value={approvalComments[entry.id] ?? ""}
                          onChange={(e) => setApprovalComments((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                          placeholder="Optional approval note"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => handleApproval(entry.id, "APPROVED")}>
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleApproval(entry.id, "REJECTED")}>
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!pendingEntries.length && !pendingLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No pending entries to approve.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Page {pendingPage} of {pendingTotalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPendingPage((p) => Math.max(1, p - 1))} disabled={pendingPage <= 1}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))} disabled={pendingPage >= pendingTotalPages}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
