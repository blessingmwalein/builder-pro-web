"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ChevronDown, Paperclip, X, Upload } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import api from "@/lib/api";
import { createTask, updateTask } from "@/store/slices/tasksSlice";
import { createTaskSchema } from "@/lib/validations";
import type { Task, TaskPriority, TaskStatus, User as AppUser, PaginatedResponse } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DatePickerField } from "@/components/shared/date-picker-field";
import { Badge } from "@/components/ui/badge";

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Done" },
];

type ProjectOption = { id: string; name: string; code?: string };
type StageOption = { id: string; stageName: string; stageOrder: number; status: string };
type SearchableOption = { value: string; label: string; sublabel?: string };
type AssigneeOption = SearchableOption & { role?: string };
type CreateTaskInput = z.input<typeof createTaskSchema>;

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ─── SearchableSelect (single) ────────────────────────────────────────────────

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search...",
  emptyText = "No results",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected ? (
            <span className="truncate">{selected.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  keywords={[opt.label, opt.sublabel ?? ""]}
                  onSelect={() => {
                    onChange(opt.value === value ? "" : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 shrink-0 ${value === opt.value ? "opacity-100" : "opacity-0"}`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="truncate text-xs text-muted-foreground">{opt.sublabel}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── MultiAssigneeSelect ──────────────────────────────────────────────────────

function MultiAssigneeSelect({
  selected,
  onChange,
  options,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  options: AssigneeOption[];
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value));
  const triggerLabel =
    selectedOptions.length === 0
      ? "Select assignees..."
      : selectedOptions.length <= 2
        ? selectedOptions.map((o) => o.label).join(", ")
        : `${selectedOptions.length} assignees selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring">
        <span className={`truncate ${selectedOptions.length === 0 ? "text-muted-foreground" : ""}`}>
          {triggerLabel}
        </span>
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name, role..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selected.includes(opt.value);
                const [firstName = "U", lastName = "N"] = opt.label.split(" ");
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    keywords={[opt.label, opt.sublabel ?? "", opt.role ?? ""]}
                    onSelect={() => toggle(opt.value)}
                  >
                    <div
                      className={`mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {getInitials(firstName, lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{opt.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {opt.role ? (
                            <><span className="font-medium text-primary/80">{opt.role}</span>{opt.sublabel ? ` · ${opt.sublabel}` : ""}</>
                          ) : (
                            opt.sublabel
                          )}
                        </p>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {selected.length > 0 && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="h-7 w-full text-xs text-muted-foreground" onClick={() => onChange([])}>
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── TaskFormDialog ───────────────────────────────────────────────────────────

export interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultStageId?: string;
  projects?: ProjectOption[];
  task?: Task | null;
  onSuccess?: () => Promise<void> | void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultStageId,
  projects: projectsProp,
  task,
  onSuccess,
}: TaskFormDialogProps) {
  const dispatch = useAppDispatch();
  const isEdit = !!task;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>(projectsProp ?? []);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stageId, setStageId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("TODO");

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: "", description: "", priority: "MEDIUM", projectId: "", startDate: "", dueDate: "", estimatedHours: undefined, assigneeIds: [] },
  });

  const selectedPriority = watch("priority");
  const selectedProject = watch("projectId");

  useEffect(() => {
    api.get<PaginatedResponse<AppUser>>("/users", { limit: 200, isActive: true })
      .then((res) => setUsers(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectsProp || projectsProp.length === 0) {
      api.get<{ items: ProjectOption[] }>("/projects", { limit: 200 })
        .then((res) => setProjects(res.items))
        .catch(() => {});
    } else {
      setProjects(projectsProp);
    }
  }, [projectsProp]);

  const loadStages = useCallback(async (projectId: string) => {
    if (!projectId) { setStages([]); return; }
    setStagesLoading(true);
    try {
      const data = await api.get<StageOption[]>(`/projects/${projectId}/stages`);
      setStages(data);
    } catch { setStages([]); } finally { setStagesLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedProject) void loadStages(selectedProject);
    else { setStages([]); setStageId(""); }
  }, [selectedProject, loadStages]);

  function normalizeAssigneeIds(assignees: unknown): string[] {
    if (!Array.isArray(assignees)) return [];
    return (assignees as any[]).map((a) => a?.user?.id ?? a?.userId ?? a?.id).filter(Boolean);
  }

  useEffect(() => {
    if (!open) return;
    if (task) {
      setValue("title", task.title);
      setValue("description", task.description ?? "");
      setValue("priority", task.priority);
      setValue("projectId", task.projectId);
      setValue("startDate", task.startDate ? task.startDate.slice(0, 10) : "");
      setValue("dueDate", task.dueDate ? task.dueDate.slice(0, 10) : "");
      setValue("estimatedHours", task.estimatedHours ?? undefined);
      setStageId(task.stageId ?? "");
      setEditStatus(task.status);
      setAssigneeIds(normalizeAssigneeIds(task.assignees));
    } else {
      reset({ title: "", description: "", priority: "MEDIUM", projectId: defaultProjectId ?? "", startDate: "", dueDate: "", estimatedHours: undefined, assigneeIds: [] });
      setStageId(defaultStageId ?? "");
      setEditStatus("TODO");
      setAssigneeIds([]);
      setPendingFiles([]);
    }
  }, [open, task, defaultProjectId, defaultStageId, reset, setValue]);

  useEffect(() => { setValue("assigneeIds", assigneeIds, { shouldValidate: false }); }, [assigneeIds, setValue]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}${f.size}`));
      return [...prev, ...files.filter((f) => !existing.has(`${f.name}${f.size}`))];
    });
    e.target.value = "";
  }

  async function uploadFiles(taskId: string) {
    for (const file of pendingFiles) {
      const fd = new FormData();
      fd.append("file", file);
      await api.postForm(`/tasks/${taskId}/attachments`, fd);
    }
  }

  async function onSubmit(data: CreateTaskInput) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        priority: data.priority ?? "MEDIUM",
        estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : undefined,
        assigneeIds,
        stageId: stageId || null,
        ...(isEdit && { status: editStatus }),
      };

      if (isEdit && task) {
        await dispatch(updateTask({ id: task.id, data: payload })).unwrap();
        if (pendingFiles.length > 0) await uploadFiles(task.id);
        toast.success("Task updated");
      } else {
        const created = await dispatch(createTask(payload)).unwrap();
        if (pendingFiles.length > 0 && (created as any)?.id) await uploadFiles((created as any).id);
        toast.success("Task created");
      }

      await onSuccess?.();
      closeDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeDialog() {
    reset();
    setAssigneeIds([]);
    setPendingFiles([]);
    setStageId("");
    onOpenChange(false);
  }

  const projectOptions: SearchableOption[] = projects.map((p) => ({ value: p.id, label: p.name, sublabel: p.code }));

  const stageOptions: SearchableOption[] = [
    { value: "__none__", label: "No Stage", sublabel: "Not assigned to a stage" },
    ...stages.map((s) => ({ value: s.id, label: s.stageName, sublabel: `Step ${s.stageOrder} · ${s.status}` })),
  ];

  const assigneeOptions: AssigneeOption[] = users.map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
    sublabel: u.email,
    role: (u as any).roles?.[0]?.name,
  }));

  const selectedAssigneeUsers = users.filter((u) => assigneeIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update task details, assignees and attachments." : "Create and assign a task in one step."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="e.g. Cast slab level 1" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} placeholder="Task details..." {...register("description")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <SearchableSelect
                value={selectedProject}
                onChange={(v) => { setValue("projectId", v, { shouldValidate: true }); setStageId(""); }}
                options={projectOptions}
                placeholder="Select project..."
                emptyText="No projects found"
              />
              {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={selectedPriority} onValueChange={(v: string | null) => setValue("priority", (v as TaskPriority) || "MEDIUM")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v: string | null) => setEditStatus((v as TaskStatus) || "TODO")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Estimated Hours</Label>
              <Input type="number" min={0} step={0.5} {...register("estimatedHours")} />
            </div>

            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <DatePickerField value={watch("startDate") || undefined} onChange={(v) => setValue("startDate", v, { shouldValidate: true })} />
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <DatePickerField value={watch("dueDate") || undefined} onChange={(v) => setValue("dueDate", v, { shouldValidate: true })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>Stage</Label>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
            {!selectedProject ? (
              <p className="text-xs italic text-muted-foreground">Select a project first to see its stages</p>
            ) : stagesLoading ? (
              <p className="text-xs text-muted-foreground">Loading stages...</p>
            ) : stages.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">This project has no stages configured</p>
            ) : (
              <SearchableSelect
                value={stageId || "__none__"}
                onChange={(v) => setStageId(v === "__none__" ? "" : v)}
                options={stageOptions}
                placeholder="Select stage..."
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Assignees</Label>
            <MultiAssigneeSelect selected={assigneeIds} onChange={setAssigneeIds} options={assigneeOptions} />
            {selectedAssigneeUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedAssigneeUsers.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1 pr-1 text-xs">
                    <span>{u.firstName} {u.lastName}</span>
                    {(u as any).roles?.[0]?.name && (
                      <span className="text-muted-foreground">· {(u as any).roles[0].name}</span>
                    )}
                    <button type="button" className="ml-1 rounded-full hover:bg-muted" onClick={() => setAssigneeIds((prev) => prev.filter((id) => id !== u.id))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Attachments</Label>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} />
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Choose Files
            </Button>
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pendingFiles.map((f, i) => (
                  <Badge key={`${f.name}-${i}`} variant="outline" className="gap-1 pr-1 text-xs">
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[160px] truncate">{f.name}</span>
                    <button type="button" className="ml-1 rounded-full hover:bg-muted" onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Task")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
