"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Edit2, Trash2, ChevronRight, Paperclip, SmilePlus, SendHorizontal, MessageSquare } from "lucide-react";
import { useAppDispatch, useAuth } from "@/lib/hooks";
import api from "@/lib/api";
import {
  updateTaskStatus,
  deleteTask,
  addTaskAssignee,
  removeTaskAssignee,
  addComment,
  createTaskChecklist,
  toggleChecklistItem,
} from "@/store/slices/tasksSlice";
import type { Task, TaskStatus, User as AppUser, PaginatedResponse } from "@/types";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

// ─── Status / Priority config ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  TODO:        { label: "To Do",       color: "text-slate-600",   bg: "bg-slate-100" },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-600",    bg: "bg-blue-50" },
  BLOCKED:     { label: "Blocked",     color: "text-red-600",     bg: "bg-red-50" },
  REVIEW:      { label: "Review",      color: "text-purple-600",  bg: "bg-purple-50" },
  DONE:        { label: "Done",        color: "text-emerald-600", bg: "bg-emerald-50" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW:      { label: "Low",      color: "text-slate-500" },
  MEDIUM:   { label: "Medium",   color: "text-yellow-600" },
  HIGH:     { label: "High",     color: "text-orange-600" },
  CRITICAL: { label: "Critical", color: "text-red-600" },
};

// ─── Normalizers ─────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function safeDate(d: string | null | undefined) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(d: string | null | undefined, status: string) {
  if (!d || status === "DONE") return false;
  return new Date(d) < new Date();
}

function normalizeAssignees(assignees: unknown) {
  if (!Array.isArray(assignees)) return [];
  return (assignees as any[]).map((a) => ({
    assignmentId: a?.id,
    userId: a?.user?.id ?? a?.userId,
    firstName: a?.user?.firstName ?? a?.firstName ?? "Unknown",
    lastName:  a?.user?.lastName  ?? a?.lastName  ?? "User",
    email:     a?.user?.email     ?? a?.email     ?? "",
    role:      a?.user?.roles?.[0]?.name ?? null,
  }));
}

function normalizeComments(comments: unknown) {
  if (!Array.isArray(comments)) return [];
  return (comments as any[]).map((c) => ({
    id: c?.id,
    content: c?.content ?? "",
    createdAt: c?.createdAt ?? new Date().toISOString(),
    userId: c?.userId ?? c?.user?.id ?? null,
    user: {
      firstName: c?.user?.firstName ?? "Unknown",
      lastName:  c?.user?.lastName  ?? "User",
    },
  }));
}

function normalizeChecklists(checklists: unknown) {
  if (!Array.isArray(checklists)) return [];
  return (checklists as any[]).map((cl) => ({
    id: cl?.id,
    title: cl?.title ?? "Checklist",
    items: Array.isArray(cl?.items) ? cl.items.map((item: any) => ({
      id:    item?.id,
      label: item?.text ?? item?.content ?? "",
      isDone: Boolean(item?.isCompleted ?? item?.isDone),
    })) : [],
  }));
}

// ─── Chat helpers ─────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["👍", "✅", "🔥", "⚠️", "❌", "💬", "⏰", "💰", "🏗️", "📋"];

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function renderMentions(content: string): React.ReactNode {
  const parts = content.split(/(@[\w][\w\s]*?(?= |$|@|\n))/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className="inline-rounded font-semibold text-primary bg-primary/10 rounded px-1 text-[13px]"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${highlight ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

// ─── TaskSheet ────────────────────────────────────────────────────────────────

export interface TaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  onRefresh?: () => void;
}

export function TaskSheet({ open, onOpenChange, taskId, onRefresh }: TaskSheetProps) {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();

  const [task, setTask]               = useState<Task | null>(null);
  const [loading, setLoading]         = useState(false);
  const [users, setUsers]             = useState<AppUser[]>([]);
  const [tab, setTab]                 = useState("overview");
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [assignPopover, setAssignPopover] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [clTitle, setClTitle]         = useState("");
  const [clItems, setClItems]         = useState("");
  const [saving, setSaving]           = useState(false);

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles]   = useState<File[]>([]);
  const [emojiOpen, setEmojiOpen]         = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const loadTask = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([
        api.get<Task>(`/tasks/${id}`),
        api.get<PaginatedResponse<AppUser>>("/users", { limit: 200, isActive: true }),
      ]);
      setTask(t);
      setUsers(u.items);
    } catch { setTask(null); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open && taskId) {
      setTab("overview");
      setCommentText("");
      void loadTask(taskId);
    }
    if (!open) setTask(null);
  }, [open, taskId, loadTask]);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function changeStatus(status: TaskStatus) {
    if (!task) return;
    setSaving(true);
    try {
      await dispatch(updateTaskStatus({ id: task.id, status })).unwrap();
      setTask((p) => p ? { ...p, status } : p);
      toast.success("Status updated");
      onRefresh?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!task) return;
    await dispatch(deleteTask(task.id)).unwrap();
    toast.success("Task deleted");
    onRefresh?.();
    onOpenChange(false);
  }

  async function addAssignee(userId: string) {
    if (!task) return;
    await dispatch(addTaskAssignee({ id: task.id, userId })).unwrap();
    toast.success("Assignee added");
    setAssignPopover(false);
    void loadTask(task.id);
  }

  async function removeAssignee(userId: string) {
    if (!task) return;
    await dispatch(removeTaskAssignee({ id: task.id, userId })).unwrap();
    void loadTask(task.id);
  }

  async function postComment() {
    if (!task || (!commentText.trim() && pendingFiles.length === 0)) return;
    setSaving(true);
    try {
      let content = commentText.trim();
      if (pendingFiles.length > 0) {
        const fileLines = pendingFiles.map((f) => `📎 ${f.name}`).join("\n");
        content = content ? `${content}\n${fileLines}` : fileLines;
      }
      await dispatch(addComment({ taskId: task.id, content })).unwrap();
      setCommentText("");
      setPendingFiles([]);
      setMentionSearch(null);
      void loadTask(task.id);
    } catch { toast.error("Failed to add comment"); }
    setSaving(false);
  }

  function handleCommentInput(val: string) {
    setCommentText(val);
    const cursor = textareaRef.current?.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const m = before.match(/@(\w*)$/);
    setMentionSearch(m ? m[1] : null);
  }

  function insertMention(u: AppUser) {
    const cursor = textareaRef.current?.selectionStart ?? commentText.length;
    const before = commentText.slice(0, cursor);
    const after  = commentText.slice(cursor);
    const atIdx  = before.lastIndexOf("@");
    const newText = before.slice(0, atIdx) + `@${u.firstName} ${u.lastName} ` + after;
    setCommentText(newText);
    setMentionSearch(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function createChecklist() {
    if (!task || !clTitle.trim()) return;
    setSaving(true);
    try {
      const items = clItems.split("\n").map((i) => i.trim()).filter(Boolean);
      await dispatch(createTaskChecklist({ taskId: task.id, title: clTitle.trim(), items })).unwrap();
      setClTitle(""); setClItems("");
      void loadTask(task.id);
      toast.success("Checklist created");
    } catch { toast.error("Failed to create checklist"); }
    setSaving(false);
  }

  async function toggleItem(checklistId: string, itemId: string) {
    if (!task) return;
    await dispatch(toggleChecklistItem({ taskId: task.id, checklistId, itemId })).unwrap();
    void loadTask(task.id);
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const assignees        = normalizeAssignees(task?.assignees);
  const comments         = normalizeComments((task as any)?.comments);
  const checklists       = normalizeChecklists((task as any)?.checklists);
  const assignedIds      = new Set(assignees.map((a) => a.userId));
  const availableUsers   = users.filter((u) => !assignedIds.has(u.id));

  const mentionUsers = mentionSearch !== null
    ? users
        .filter((u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(mentionSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(mentionSearch.toLowerCase())
        )
        .slice(0, 5)
    : [];

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (tab === "comments" && comments.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [comments.length, tab]);
  const totalItems       = checklists.reduce((n, cl) => n + cl.items.length, 0);
  const doneItems        = checklists.reduce((n, cl) => n + cl.items.filter((i: { isDone: boolean }) => i.isDone).length, 0);
  const clPct            = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const statusCfg        = STATUS_CONFIG[task?.status ?? "TODO"];
  const priorityCfg      = PRIORITY_CONFIG[task?.priority ?? "MEDIUM"];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-hidden p-0 sm:w-[50vw] sm:max-w-[50vw]"
        >
          {/* ── Header ── */}
          <div className="shrink-0 border-b px-5 pb-4 pt-5">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : task ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold leading-snug">{task.title}</h2>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm" variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setEditFormOpen(true)}
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge className={`${statusCfg?.bg} ${statusCfg?.color} border-0 text-xs font-medium`}>
                    {statusCfg?.label ?? task.status}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${priorityCfg?.color}`}>
                    {priorityCfg?.label ?? task.priority}
                  </Badge>
                  {task.project?.name && (
                    <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {task.project.name}
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* ── Quick stat strip ── */}
          {task && !loading && (
            <div className="grid shrink-0 grid-cols-4 divide-x border-b text-center">
              {[
                { label: "Due",       value: task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "--", warn: isOverdue(task.dueDate, task.status) },
                { label: "Est.",      value: task.estimatedHours ? `${task.estimatedHours}h` : "--" },
                { label: "Assignees", value: String(assignees.length) },
                { label: "Checklist", value: totalItems > 0 ? `${doneItems}/${totalItems}` : "--" },
              ].map((s) => (
                <div key={s.label} className="px-2 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className={`mt-0.5 text-xs font-semibold ${s.warn ? "text-destructive" : ""}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Tabs ── */}
          <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="h-10 shrink-0 justify-start gap-0 rounded-none border-b bg-transparent px-5">
              {["overview", "assignees", "comments", "checklist"].map((t) => (
                <TabsTrigger
                  key={t} value={t}
                  className="h-full rounded-none border-b-2 border-transparent px-3 text-xs capitalize data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t}
                  {t === "comments" && comments.length > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{comments.length}</span>
                  )}
                  {t === "checklist" && totalItems > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{clPct}%</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className={`flex-1 ${tab === "comments" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>

              {/* ── Overview ── */}
              <TabsContent value="overview" className="mt-0 space-y-4 p-5">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : task ? (
                  <>
                    {task.description && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
                        <p className="text-sm leading-relaxed">{task.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <InfoRow label="Status"     value={statusCfg?.label ?? task.status} />
                      <InfoRow label="Priority"   value={priorityCfg?.label ?? task.priority} />
                      <InfoRow label="Start Date" value={safeDate(task.startDate)} />
                      <InfoRow label="Due Date"   value={safeDate(task.dueDate)} highlight={isOverdue(task.dueDate, task.status)} />
                      <InfoRow label="Est. Hours" value={task.estimatedHours ? `${task.estimatedHours}h` : "--"} />
                      <InfoRow label="Project"    value={task.project?.name ?? "--"} />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Change Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                          <button
                            key={s} type="button"
                            disabled={saving || task.status === s}
                            onClick={() => void changeStatus(s as TaskStatus)}
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                              task.status === s
                                ? `${cfg.bg} ${cfg.color} border-current`
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Created {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </>
                ) : null}
              </TabsContent>

              {/* ── Assignees ── */}
              <TabsContent value="assignees" className="mt-0 space-y-4 p-5">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : (
                  <>
                    {assignees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No assignees yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {assignees.map((a) => (
                          <div key={a.assignmentId || a.userId} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {getInitials(a.firstName, a.lastName)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{a.firstName} {a.lastName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {a.role ? (
                                    <><span className="font-medium text-primary/80">{a.role}</span>{a.email ? ` · ${a.email}` : ""}</>
                                  ) : a.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => void removeAssignee(a.userId)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Add Assignee</p>
                      <Popover open={assignPopover} onOpenChange={setAssignPopover}>
                        <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm">
                          Search users to assign...
                          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search by name or role..." />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                {availableUsers.map((u) => (
                                  <CommandItem
                                    key={u.id} value={u.id}
                                    keywords={[`${u.firstName} ${u.lastName}`, u.email, (u as any).roles?.[0]?.name ?? ""]}
                                    onSelect={() => void addAssignee(u.id)}
                                  >
                                    <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                      {getInitials(u.firstName, u.lastName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium">{u.firstName} {u.lastName}</p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {(u as any).roles?.[0]?.name
                                          ? <><span className="font-medium text-primary/80">{(u as any).roles[0].name}</span> · {u.email}</>
                                          : u.email}
                                      </p>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ── Comments ── */}
              <TabsContent value="comments" className="mt-0 flex flex-col h-full data-[state=inactive]:hidden">
                {loading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : (
                  <>
                    {/* ── Message list ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 thin-scroll">
                      {comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                            <MessageSquare className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium">No messages yet</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Start the conversation. Use @ to mention a teammate.
                          </p>
                        </div>
                      ) : (
                        comments.map((c) => {
                          const isMe = c.userId === currentUser?.id;
                          return (
                            <div
                              key={c.id}
                              className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                            >
                              {!isMe && (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                  {getInitials(c.user.firstName, c.user.lastName)}
                                </div>
                              )}
                              <div className={`flex flex-col gap-0.5 max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                                {!isMe && (
                                  <p className="text-[10px] font-semibold text-muted-foreground px-1">
                                    {c.user.firstName} {c.user.lastName}
                                  </p>
                                )}
                                <div
                                  className={`px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                                    isMe
                                      ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
                                      : "rounded-2xl rounded-bl-sm bg-muted"
                                  }`}
                                >
                                  {renderMentions(c.content)}
                                </div>
                                <p className="text-[10px] text-muted-foreground px-1">
                                  {relativeTime(c.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* ── Mention suggestions ── */}
                    {mentionSearch !== null && mentionUsers.length > 0 && (
                      <div className="mx-4 mb-1 overflow-hidden rounded-xl border bg-background shadow-lg">
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Mention
                        </p>
                        {mentionUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted"
                            onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {getInitials(u.firstName, u.lastName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Pending file chips ── */}
                    {pendingFiles.length > 0 && (
                      <div className="mx-4 mb-1 flex flex-wrap gap-1.5">
                        {pendingFiles.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 text-xs"
                          >
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            <span className="max-w-[120px] truncate">{f.name}</span>
                            <button
                              type="button"
                              className="ml-0.5 text-muted-foreground hover:text-destructive"
                              onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Composer ── */}
                    <div className="shrink-0 border-t px-4 py-3">
                      <div className="flex items-end gap-2">
                        {/* File attach */}
                        <button
                          type="button"
                          title="Attach file"
                          className="mb-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            setPendingFiles((prev) => [...prev, ...files]);
                            e.target.value = "";
                          }}
                        />

                        {/* Textarea */}
                        <Textarea
                          ref={textareaRef}
                          rows={1}
                          className="min-h-[38px] flex-1 resize-none text-sm"
                          placeholder="Message… type @ to mention"
                          value={commentText}
                          onChange={(e) => handleCommentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (mentionSearch !== null && mentionUsers.length > 0) return;
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void postComment();
                            }
                          }}
                        />

                        {/* Emoji picker */}
                        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="mb-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <SmilePlus className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" side="top" className="w-auto p-2">
                            <div className="grid grid-cols-5 gap-1">
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted"
                                  onClick={() => {
                                    setCommentText((prev) => prev + emoji);
                                    setEmojiOpen(false);
                                    setTimeout(() => textareaRef.current?.focus(), 0);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Send */}
                        <Button
                          size="sm"
                          className="mb-1 h-8 w-8 shrink-0 p-0"
                          disabled={(!commentText.trim() && pendingFiles.length === 0) || saving}
                          onClick={() => void postComment()}
                        >
                          <SendHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Enter to send · Shift+Enter for new line · @ to mention
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ── Checklist ── */}
              <TabsContent value="checklist" className="mt-0 space-y-4 p-5">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : (
                  <>
                    {totalItems > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Overall Progress</span>
                          <span className="font-semibold">{doneItems}/{totalItems} ({clPct}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${clPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {checklists.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No checklists yet.</p>
                    ) : (
                      checklists.map((cl) => (
                        <div key={cl.id} className="rounded-xl border bg-muted/30 p-3">
                          <p className="mb-2.5 text-sm font-semibold">{cl.title}</p>
                          <div className="space-y-1.5">
                            {cl.items.map((it: { id: string; label: string; isDone: boolean }) => (
                              <label
                                key={it.id}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                              >
                                <Checkbox
                                  checked={it.isDone}
                                  onCheckedChange={() => void toggleItem(cl.id, it.id)}
                                />
                                <span className={it.isDone ? "line-through text-muted-foreground" : ""}>
                                  {it.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}

                    <Separator />

                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">New Checklist</p>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={clTitle}
                          onChange={(e) => setClTitle(e.target.value)}
                          placeholder="e.g. Safety Checks"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Items (one per line)</Label>
                        <Textarea
                          rows={3}
                          value={clItems}
                          onChange={(e) => setClItems(e.target.value)}
                          placeholder={"Wear hard hat\nCheck scaffolding\nVerify permits"}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!clTitle.trim() || saving}
                        onClick={() => void createChecklist()}
                      >
                        Create Checklist
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Edit form */}
      {task && (
        <TaskFormDialog
          open={editFormOpen}
          onOpenChange={setEditFormOpen}
          task={task}
          onSuccess={() => {
            void loadTask(task.id);
            onRefresh?.();
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{task?.title}&quot;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
