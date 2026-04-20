"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  ListTodo,
  Columns3,
  User,
  Calendar,
  Trash2,
  MessageSquare,
  ClipboardList,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import api from "@/lib/api";
import {
  fetchTasks,
  fetchMyQueue,
  createTask,
  fetchTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addTaskAssignee,
  removeTaskAssignee,
  fetchTaskComments,
  addComment,
  createTaskChecklist,
  toggleChecklistItem,
} from "@/store/slices/tasksSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { createTaskSchema } from "@/lib/validations";
import type { Task, TaskPriority, TaskStatus, User as AppUser, PaginatedResponse } from "@/types";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField } from "@/components/shared/date-picker-field";

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

type CreateTaskInput = z.input<typeof createTaskSchema>;

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

type NormalizedAssignee = {
  assignmentId?: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  companyId?: string;
  taskId?: string;
  assignedAt?: string;
};

type NormalizedComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string | null;
  };
};

type NormalizedChecklistItem = {
  id: string;
  label: string;
  isDone: boolean;
};

type NormalizedChecklist = {
  id: string;
  title: string;
  items: NormalizedChecklistItem[];
};

function normalizeAssignees(assignees: unknown): NormalizedAssignee[] {
  if (!Array.isArray(assignees)) return [];

  return assignees.map((entry: any) => {
    const nestedUser = entry?.user ?? null;
    const firstName = nestedUser?.firstName ?? entry?.firstName ?? "Unknown";
    const lastName = nestedUser?.lastName ?? entry?.lastName ?? "User";
    const email = nestedUser?.email ?? entry?.email ?? "";
    const avatarUrl = nestedUser?.avatarUrl ?? entry?.avatarUrl ?? null;
    const userId = nestedUser?.id ?? entry?.userId ?? entry?.id;

    return {
      assignmentId: entry?.id,
      userId,
      firstName,
      lastName,
      email,
      avatarUrl,
      companyId: entry?.companyId,
      taskId: entry?.taskId,
      assignedAt: entry?.createdAt,
    };
  });
}

function normalizeComments(comments: unknown): NormalizedComment[] {
  if (!Array.isArray(comments)) return [];

  return comments.map((comment: any) => ({
    id: comment?.id,
    content: comment?.content ?? "",
    createdAt: comment?.createdAt ?? new Date().toISOString(),
    user: {
      firstName: comment?.user?.firstName ?? "Unknown",
      lastName: comment?.user?.lastName ?? "User",
      email: comment?.user?.email,
      avatarUrl: comment?.user?.avatarUrl,
    },
  }));
}

function normalizeChecklists(checklists: unknown): NormalizedChecklist[] {
  if (!Array.isArray(checklists)) return [];

  return checklists.map((checklist: any) => ({
    id: checklist?.id,
    title: checklist?.title ?? "Checklist",
    items: Array.isArray(checklist?.items)
      ? checklist.items.map((item: any) => ({
          id: item?.id,
          label: item?.text ?? item?.content ?? "Untitled item",
          isDone: Boolean(item?.isCompleted ?? item?.isDone),
        }))
      : [],
  }));
}

export default function TasksPage() {
  const dispatch = useAppDispatch();
  const { items: tasks, myQueue, current, isLoading } = useAppSelector((s) => s.tasks);
  const { items: projects } = useAppSelector((s) => s.projects);

  const [users, setUsers] = useState<AppUser[]>([]);
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
    void api
      .get<PaginatedResponse<AppUser>>("/users", { limit: 200, isActive: true })
      .then((res) => setUsers(res.items))
      .catch(() => setUsers([]));
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

  async function openTask(taskId: string) {
    setSelectedTaskId(taskId);
    setSheetOpen(true);
    await dispatch(fetchTask(taskId));
    await dispatch(fetchTaskComments(taskId));
  }

  async function refreshCurrentTask() {
    if (!selectedTaskId) return;
    await dispatch(fetchTask(selectedTaskId));
    await dispatch(fetchTaskComments(selectedTaskId));
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
          <TabsTrigger value="list" className="gap-1.5 text-xs">
            <ListTodo className="h-3.5 w-3.5" /> List
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

        <TabsContent value="list">
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
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assignees</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Est. Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id} className="cursor-pointer" onClick={() => openTask(task.id)}>
                        <TableCell className="max-w-[250px] truncate font-medium">{task.title}</TableCell>
                        <TableCell className="text-muted-foreground">{task.project?.name || "--"}</TableCell>
                        <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                        <TableCell><StatusBadge status={task.status} /></TableCell>
                        <TableCell><AssigneeAvatars assignees={task.assignees} maxShow={3} /></TableCell>
                        <TableCell>
                          <span
                            className={
                              task.status !== "DONE" && isOverdue(task.dueDate)
                                ? "font-medium text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {formatDate(task.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {task.estimatedHours != null ? `${task.estimatedHours}h` : "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        users={users}
        onCreated={async () => {
          await dispatch(fetchTasks({}));
          await dispatch(fetchMyQueue());
        }}
      />

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={current}
        users={users}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onRefresh={refreshCurrentTask}
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

function CreateTaskDialog({
  open,
  onOpenChange,
  projects,
  users,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[];
  users: AppUser[];
  onCreated: () => Promise<void>;
}) {
  const dispatch = useAppDispatch();
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      projectId: "",
      startDate: "",
      dueDate: "",
      estimatedHours: undefined,
      assigneeIds: [],
    },
  });

  const selectedPriority = watch("priority");
  const selectedProject = watch("projectId");

  useEffect(() => {
    setValue("assigneeIds", assigneeIds, { shouldValidate: false });
  }, [assigneeIds, setValue]);

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function onSubmit(data: CreateTaskInput) {
    const estimatedHours =
      typeof data.estimatedHours === "number"
        ? data.estimatedHours
        : data.estimatedHours
          ? Number(data.estimatedHours)
          : undefined;

    await dispatch(
      createTask({
        ...data,
        priority: data.priority || "MEDIUM",
        estimatedHours,
        assigneeIds,
      })
    ).unwrap();
    await onCreated();
    reset();
    setAssigneeIds([]);
    onOpenChange(false);
  }

  function close() {
    reset();
    setAssigneeIds([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Create and assign task in one step.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. Cast slab level 1" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Task details" {...register("description")} />
            </div>

            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={selectedProject} onValueChange={(v: string | null) => setValue("projectId", v || "", { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={selectedPriority} onValueChange={(v: string | null) => setValue("priority", (v as TaskPriority) || "MEDIUM")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input type="number" min={0} step={0.5} {...register("estimatedHours")} />
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePickerField
                value={watch("startDate") || undefined}
                onChange={(value) => setValue("startDate", value, { shouldValidate: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <DatePickerField
                value={watch("dueDate") || undefined}
                onChange={(value) => setValue("dueDate", value, { shouldValidate: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign Users</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
              {users.length === 0 ? (
                <p className="text-xs text-muted-foreground">No users available.</p>
              ) : (
                users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded p-1 hover:bg-muted/60">
                    <Checkbox checked={assigneeIds.includes(u.id)} onCheckedChange={() => toggleAssignee(u.id)} />
                    <span className="text-sm">{u.firstName} {u.lastName}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create Task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskSheet({
  open,
  onOpenChange,
  task,
  users,
  projects,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  users: AppUser[];
  projects: { id: string; name: string }[];
  onRefresh: () => Promise<void>;
}) {
  const dispatch = useAppDispatch();
  const [commentText, setCommentText] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistItemsRaw, setChecklistItemsRaw] = useState("");
  const [taskTab, setTaskTab] = useState("details");
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [confirmChecklistOpen, setConfirmChecklistOpen] = useState(false);
  const [confirmAssignOpen, setConfirmAssignOpen] = useState(false);
  const [pendingAssignUserId, setPendingAssignUserId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editStatus, setEditStatus] = useState<TaskStatus>("TODO");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editEstimatedHours, setEditEstimatedHours] = useState("");

  useEffect(() => {
    if (!task) return;
    setEditTitle(task.title || "");
    setEditDescription(task.description || "");
    setEditProjectId(task.projectId || "");
    setEditPriority(task.priority || "MEDIUM");
    setEditStatus(task.status || "TODO");
    setEditStartDate(task.startDate ? task.startDate.slice(0, 10) : "");
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setEditEstimatedHours(task.estimatedHours != null ? String(task.estimatedHours) : "");
  }, [task]);

  const normalizedAssignees = useMemo(() => normalizeAssignees(task?.assignees), [task?.assignees]);
  const normalizedComments = useMemo(() => normalizeComments(task?.comments), [task?.comments]);
  const normalizedChecklists = useMemo(() => normalizeChecklists(task?.checklists), [task?.checklists]);

  const unassignedUsers = useMemo(() => {
    if (!task) return [] as AppUser[];
    const assignedIds = new Set(normalizedAssignees.map((a) => a.userId));
    return users.filter((u) => !assignedIds.has(u.id));
  }, [task, users, normalizedAssignees]);

  async function saveTask() {
    if (!task) return;
    await dispatch(
      updateTask({
        id: task.id,
        data: {
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          status: editStatus,
          projectId: editProjectId,
          startDate: editStartDate || undefined,
          dueDate: editDueDate || undefined,
          estimatedHours: editEstimatedHours ? Number.parseFloat(editEstimatedHours) : undefined,
        },
      })
    ).unwrap();
    await onRefresh();
  }

  async function saveStatus(status: TaskStatus) {
    if (!task) return;
    setEditStatus(status);
    await dispatch(updateTaskStatus({ id: task.id, status })).unwrap();
    await onRefresh();
  }

  async function removeTask() {
    if (!task) return;
    await dispatch(deleteTask(task.id)).unwrap();
    onOpenChange(false);
  }

  async function addAssignee(userId: string) {
    if (!task) return;
    await dispatch(addTaskAssignee({ id: task.id, userId })).unwrap();
    await onRefresh();
  }

  async function confirmAssign() {
    if (!pendingAssignUserId) return;
    await addAssignee(pendingAssignUserId);
    setPendingAssignUserId(null);
    setConfirmAssignOpen(false);
  }

  async function unassign(userId: string) {
    if (!task) return;
    await dispatch(removeTaskAssignee({ id: task.id, userId })).unwrap();
    await onRefresh();
  }

  async function postComment() {
    if (!task || !commentText.trim()) return;
    await dispatch(addComment({ taskId: task.id, content: commentText.trim() })).unwrap();
    setCommentText("");
    await onRefresh();
  }

  async function addChecklist() {
    if (!task || !checklistTitle.trim()) return;
    const items = checklistItemsRaw
      .split("\n")
      .map((i) => i.trim())
      .filter(Boolean);
    await dispatch(createTaskChecklist({ taskId: task.id, title: checklistTitle.trim(), items })).unwrap();
    setChecklistTitle("");
    setChecklistItemsRaw("");
    await onRefresh();
  }

  async function toggleItem(checklistId: string, itemId: string) {
    if (!task) return;
    await dispatch(toggleChecklistItem({ taskId: task.id, checklistId, itemId })).unwrap();
    await onRefresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:w-[50vw] data-[side=right]:sm:max-w-[50vw] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{task?.title || "Task"}</SheetTitle>
          <SheetDescription>Task detail, assignments, comments and checklist workflow.</SheetDescription>
        </SheetHeader>

        {!task ? (
          <div className="px-4 pb-4 text-sm text-muted-foreground">Select a task to view details.</div>
        ) : (
          <div className="space-y-5 px-4 pb-6">
            <Card>
              <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Project</p>
                  <p className="mt-1 text-sm font-semibold">{task.project?.name || "--"}</p>
                  <p className="text-xs text-muted-foreground">{task.project?.code || "--"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Client</p>
                  <p className="mt-1 text-sm font-semibold">{task.project?.client?.name || "--"}</p>
                  <p className="text-xs text-muted-foreground">{task.project?.client?.email || "--"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Comments</p>
                  <p className="mt-1 text-sm font-semibold">{(task as any)?._count?.comments ?? normalizedComments.length}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Attachments</p>
                  <p className="mt-1 text-sm font-semibold">{(task as any)?._count?.attachments ?? 0}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs value={taskTab} onValueChange={setTaskTab}>
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="details">Task Details</TabsTrigger>
                <TabsTrigger value="assignees">Assignees</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="checklists">Checklist</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Task Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Title</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Project</Label>
                    <Select value={editProjectId} onValueChange={(v: string | null) => setEditProjectId(v || "")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={(v: string | null) => void saveStatus((v as TaskStatus) || "TODO")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Priority</Label>
                    <Select value={editPriority} onValueChange={(v: string | null) => setEditPriority((v as TaskPriority) || "MEDIUM")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Estimated Hours</Label>
                    <Input type="number" step={0.5} value={editEstimatedHours} onChange={(e) => setEditEstimatedHours(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date</Label>
                    <DatePickerField value={editStartDate || undefined} onChange={setEditStartDate} />
                  </div>
                  <div className="space-y-1">
                    <Label>Due Date</Label>
                    <DatePickerField value={editDueDate || undefined} onChange={setEditDueDate} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  <span className="text-xs text-muted-foreground">Created {new Date(task.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setConfirmUpdateOpen(true)}>Save Changes</Button>
                  <Button variant="destructive" onClick={() => void removeTask()}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assignees" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Assignee Profiles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                {normalizedAssignees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignees yet.</p>
                ) : (
                  normalizedAssignees.map((a) => (
                    <div key={a.assignmentId || a.userId} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{a.firstName} {a.lastName}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                        <p className="text-xs text-muted-foreground">Assigned: {a.assignedAt ? new Date(a.assignedAt).toLocaleString() : "--"}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void unassign(a.userId)}>Remove</Button>
                      </div>
                    </div>
                  ))
                )}

                <Separator />
                <p className="text-xs font-medium text-muted-foreground">Available Users</p>
                <div className="space-y-2">
                  {unassignedUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">All users already assigned.</p>
                  ) : (
                    unassignedUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between rounded border p-2">
                        <div>
                          <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => {
                          setPendingAssignUserId(u.id);
                          setConfirmAssignOpen(true);
                        }}>Assign</Button>
                      </div>
                    ))
                  )}
                </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                <ScrollArea className="h-[420px] rounded-md border p-3">
                  <div className="space-y-3">
                  {normalizedComments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  ) : (
                    normalizedComments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar className="h-8 w-8" size="sm">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(c.user.firstName, c.user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[85%] rounded-2xl border bg-muted/50 px-3 py-2">
                          <p className="text-xs font-semibold">{c.user.firstName} {c.user.lastName}</p>
                          <p className="text-sm">{c.content}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                  </div>
                </ScrollArea>
                <Textarea rows={2} placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <Button size="sm" onClick={() => void postComment()}>Add Comment</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="checklists" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                {normalizedChecklists.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No checklists yet.</p>
                ) : (
                  normalizedChecklists.map((cl) => (
                    <div key={cl.id} className="rounded-xl border bg-muted/40 p-3">
                      <p className="mb-2 text-sm font-medium">{cl.title}</p>
                      <div className="space-y-2">
                        {cl.items.map((it) => (
                          <label key={it.id} className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm">
                            <Checkbox checked={it.isDone} onCheckedChange={() => void toggleItem(cl.id, it.id)} />
                            <span className={it.isDone ? "line-through text-muted-foreground" : ""}>{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <Separator />
                <div className="space-y-2">
                  <Label>Checklist Title</Label>
                  <Input value={checklistTitle} onChange={(e) => setChecklistTitle(e.target.value)} placeholder="Safety Checklist" />
                </div>
                <div className="space-y-2">
                  <Label>Items (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={checklistItemsRaw}
                    onChange={(e) => setChecklistItemsRaw(e.target.value)}
                    placeholder={"Wear hard hat\nCheck scaffolding"}
                  />
                </div>
                <Button size="sm" onClick={() => setConfirmChecklistOpen(true)}>Create Checklist</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>

      <AlertDialog open={confirmUpdateOpen} onOpenChange={setConfirmUpdateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Task Update</AlertDialogTitle>
            <AlertDialogDescription>Apply the latest task changes now?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void saveTask()}>Yes, Update Task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmChecklistOpen} onOpenChange={setConfirmChecklistOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Checklist</AlertDialogTitle>
            <AlertDialogDescription>Create this checklist on the task now?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void addChecklist()}>Yes, Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAssignOpen} onOpenChange={setConfirmAssignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign User</AlertDialogTitle>
            <AlertDialogDescription>Confirm adding this user as an assignee?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmAssign()}>Yes, Assign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
