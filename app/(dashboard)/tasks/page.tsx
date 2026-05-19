"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  ListTodo,
  Columns3,
  User,
  Calendar,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchTasks,
  fetchMyQueue,
  updateTaskStatus,
} from "@/store/slices/tasksSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import type { Task, TaskPriority, TaskStatus } from "@/types";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { GanttChart } from "@/components/shared/gantt-chart";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskSheet } from "@/components/tasks/task-sheet";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: "TODO", label: "To Do", color: "bg-gray-400" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
  { value: "BLOCKED", label: "Blocked", color: "bg-red-500" },
  { value: "REVIEW", label: "Review", color: "bg-purple-500" },
  { value: "DONE", label: "Done", color: "bg-emerald-500" },
];

const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function normalizeAssignees(assignees: unknown) {
  if (!Array.isArray(assignees)) return [];
  return (assignees as any[]).map((entry) => {
    const nestedUser = entry?.user ?? null;
    return {
      userId: nestedUser?.id ?? entry?.userId ?? entry?.id,
      firstName: nestedUser?.firstName ?? entry?.firstName ?? "Unknown",
      lastName: nestedUser?.lastName ?? entry?.lastName ?? "User",
    };
  });
}

export default function TasksPage() {
  const dispatch = useAppDispatch();
  const { items: tasks, myQueue, isLoading } = useAppSelector((s) => s.tasks);
  const { items: projects } = useAppSelector((s) => s.projects);

  const [createOpen, setCreateOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  // Drag-and-drop state for the Kanban board.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  // Prevents double-firing when onDragLeave races with onDragEnter on nested children.
  const dragCounter = useRef<Record<string, number>>({});

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, taskId: string) {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStatus(null);
    dragCounter.current = {};
  }

  function handleColumnDragEnter(status: TaskStatus) {
    dragCounter.current[status] = (dragCounter.current[status] || 0) + 1;
    setDragOverStatus(status);
  }

  function handleColumnDragLeave(status: TaskStatus) {
    dragCounter.current[status] = Math.max(0, (dragCounter.current[status] || 0) - 1);
    if (dragCounter.current[status] === 0 && dragOverStatus === status) {
      setDragOverStatus(null);
    }
  }

  async function handleColumnDrop(e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    setDragOverStatus(null);
    dragCounter.current = {};
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await dispatch(updateTaskStatus({ id: taskId, status: newStatus })).unwrap();
      toast.success(
        `Moved to ${TASK_STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus}`,
      );
      void dispatch(fetchMyQueue());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
    }
  }

  useEffect(() => {
    dispatch(fetchTasks({}));
    dispatch(fetchMyQueue());
    dispatch(fetchProjects({ limit: 100 }));
  }, [dispatch]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.project?.name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "ALL") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    if (projectFilter !== "ALL") {
      result = result.filter((t) => t.projectId === projectFilter);
    }

    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, projectFilter]);

  const sortedQueue = useMemo(() => {
    return [...myQueue].sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [myQueue]);

  function openTask(taskId: string) {
    setSelectedTaskId(taskId);
    setSheetOpen(true);
  }

  async function refreshTasks() {
    await dispatch(fetchTasks({}));
    await dispatch(fetchMyQueue());
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Create, assign, track and complete project tasks.">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[220px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={projectFilter} onValueChange={(v: string | null) => setProjectFilter(v as string)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v as TaskStatus | "ALL")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v: string | null) => setPriorityFilter(v as TaskPriority | "ALL")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1.5 text-xs">
            <Columns3 className="h-3.5 w-3.5" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-1.5 text-xs">
            <ListTodo className="h-3.5 w-3.5" /> Gantt
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" /> My Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {filteredTasks.length === 0 && !isLoading ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks found"
              description="Create your first task or adjust your filters."
              actionLabel="New Task"
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {TASK_STATUSES.map((col) => {
                const isDropTarget = dragOverStatus === col.value;
                return (
                  <div
                    key={col.value}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDragEnter={() => handleColumnDragEnter(col.value)}
                    onDragLeave={() => handleColumnDragLeave(col.value)}
                    onDrop={(e) => void handleColumnDrop(e, col.value)}
                    className={`flex flex-col rounded-lg border bg-muted/30 transition-colors ${
                      isDropTarget ? "border-primary ring-2 ring-primary/40 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 border-b px-3 py-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                      <span className="text-sm font-semibold">{col.label}</span>
                      <span className="ml-auto rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                        {filteredTasks.filter((t) => t.status === col.value).length}
                      </span>
                    </div>
                    <div className="min-h-24 space-y-2 p-2">
                      {filteredTasks
                        .filter((t) => t.status === col.value)
                        .map((task) => {
                          const isDragging = draggingId === task.id;
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              className={`cursor-grab active:cursor-grabbing ${
                                isDragging ? "opacity-40" : ""
                              }`}
                            >
                              <Card
                                size="sm"
                                className="transition-shadow hover:shadow-md"
                                onClick={() => openTask(task.id)}
                              >
                                <CardContent className="space-y-2.5">
                                  <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <PriorityBadge priority={task.priority} />
                                    {task.project?.name && (
                                      <span className="max-w-[120px] truncate text-[11px] text-muted-foreground">
                                        {task.project.name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <AssigneeAvatars assignees={task.assignees} maxShow={3} size="sm" />
                                    {task.dueDate && (
                                      <span
                                        className={`flex items-center gap-1 text-[11px] ${
                                          task.status !== "DONE" && isOverdue(task.dueDate)
                                            ? "font-medium text-destructive"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        <Calendar className="h-3 w-3" /> {formatDate(task.dueDate)}
                                      </span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gantt">
          {filteredTasks.length === 0 && !isLoading ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks found"
              description="Create your first task or adjust your filters."
              actionLabel="New Task"
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <GanttChart tasks={filteredTasks} onTaskClick={openTask} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue">
          {sortedQueue.length === 0 && !isLoading ? (
            <EmptyState icon={User} title="Your queue is empty" description="Tasks assigned to you will appear here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedQueue.map((task) => (
                <Card key={task.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openTask(task.id)}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">{task.title}</p>
                        {task.project && <p className="truncate text-xs text-muted-foreground">{task.project.name}</p>}
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <PriorityBadge priority={task.priority} />
                      {task.dueDate && (
                        <span className={task.status !== "DONE" && isOverdue(task.dueDate) ? "font-medium text-destructive" : ""}>
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onSuccess={refreshTasks}
      />

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        taskId={selectedTaskId}
        onRefresh={refreshTasks}
      />
    </div>
  );
}

function AssigneeAvatars({
  assignees,
  maxShow = 3,
  size = "default",
}: {
  assignees: unknown;
  maxShow?: number;
  size?: "sm" | "default";
}) {
  const normalized = normalizeAssignees(assignees);

  if (normalized.length === 0) {
    return <span className="text-[11px] text-muted-foreground">Unassigned</span>;
  }

  const visible = normalized.slice(0, maxShow);
  const overflow = normalized.length - maxShow;
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className="flex -space-x-1.5">
      {visible.map((u) => (
        <Avatar key={u.userId} className={`${sizeClass} border-2 border-background`} size={size === "sm" ? "sm" : "default"}>
          <AvatarFallback className={`${textSize} bg-primary/10 text-primary`}>
            {getInitials(u.firstName || "U", u.lastName || "N")}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className={`flex ${sizeClass} items-center justify-center rounded-full border-2 border-background bg-muted ${textSize} font-medium text-muted-foreground`}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
