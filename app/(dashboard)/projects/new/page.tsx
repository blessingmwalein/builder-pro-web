"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, Plus, Search, Trash2,
  LayoutTemplate, Users, FileText, Eye, ClipboardCheck,
  Building2, CalendarRange, DollarSign, User2, Briefcase, MapPin, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchClients } from "@/store/slices/crmSlice";
import { fetchEmployees } from "@/store/slices/employeesSlice";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { DatePickerField } from "@/components/shared/date-picker-field";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ProjectType, CompanyDetails, Client, Employee } from "@/types";

// ─── types ───────────────────────────────────────────────────────────────────

type ProjectTemplate = {
  id: string;
  name: string;
  description: string | null;
  constructionType: string | null;
  stages: { workflowCode: string; stageOrder: number; requiresApproval: boolean }[];
  tasks: { title: string; priority: string; roleCode: string | null }[];
  documents: { documentType: string; name: string; isRequired: boolean }[];
  roles: { roleCode: string; isRequired: boolean }[];
  budgetLines: { categoryCode: string; suggestedPct: number | null }[];
  _count?: { tasks: number; documents: number };
};

type MemberEntry = { userId: string; displayName: string; role: string };

type DocEntry = { name: string; type: string; isRequired: boolean; checked: boolean };

type WizardState = {
  name: string;
  description: string;
  projectType: ProjectType;
  templateId: string;
  clientId: string;
  projectManagerId: string;
  siteAddress: string;
  startDate: string;
  endDate: string;
  baselineBudget: string;
  priority: string;
  docChecklist: DocEntry[];
  members: MemberEntry[];
  excludedStages: string[];
};

type SearchableOption = {
  value: string;
  label: string;
  sublabel?: string;
  avatar?: string;
};

const BLANK: WizardState = {
  name: "", description: "", projectType: "RESIDENTIAL", templateId: "",
  clientId: "", projectManagerId: "", siteAddress: "",
  startDate: "", endDate: "", baselineBudget: "",
  priority: "MEDIUM",
  docChecklist: [], members: [], excludedStages: [],
};

const PROJECT_TYPES: { label: string; value: ProjectType }[] = [
  { label: "Residential", value: "RESIDENTIAL" },
  { label: "Commercial", value: "COMMERCIAL" },
  { label: "Renovation", value: "RENOVATION" },
  { label: "Industrial", value: "INDUSTRIAL" },
  { label: "Infrastructure", value: "INFRASTRUCTURE" },
];

const STEPS = [
  { label: "Basic Info", icon: ClipboardCheck },
  { label: "Documents", icon: FileText },
  { label: "Team", icon: Users },
  { label: "Preview", icon: Eye },
  { label: "Review", icon: LayoutTemplate },
];

const FALLBACK_ROLES = [
  { code: "PROJECT_MANAGER", name: "Project Manager" },
  { code: "SITE_ENGINEER", name: "Site Engineer" },
  { code: "FOREMAN", name: "Foreman" },
  { code: "SURVEYOR", name: "Surveyor" },
  { code: "SUBCONTRACTOR", name: "Subcontractor" },
  { code: "SAFETY_OFFICER", name: "Safety Officer" },
  { code: "MEMBER", name: "Member" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-amber-500",
  CRITICAL: "text-red-500",
};

// ─── SearchableSelect ─────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, url, size = "sm" }: { name: string; url?: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  if (url) return <img src={url} alt={name} className={`${cls} rounded-full object-cover`} />;
  return (
    <div className={`${cls} flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

function SearchableSelect({
  value, onChange, options, placeholder = "Search...", emptyText = "No results",
  showAvatar = false, disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyText?: string;
  showAvatar?: boolean;
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
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              {showAvatar && <Avatar name={selected.label} size="sm" />}
              <span className="truncate">{selected.label}</span>
            </>
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
                  data-checked={value === opt.value}
                >
                  {showAvatar && <Avatar name={opt.label} size="sm" />}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm truncate">{opt.label}</span>
                    {opt.sublabel && <span className="text-xs text-muted-foreground truncate">{opt.sublabel}</span>}
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

// ─── Live Preview Panel ───────────────────────────────────────────────────────

function PreviewPanel({
  form, clients, employees, selectedTpl,
}: {
  form: WizardState;
  clients: Client[];
  employees: Employee[];
  selectedTpl: ProjectTemplate | null;
}) {
  const client = clients.find((c) => c.id === form.clientId);
  const pm = employees.find((e) => e.userId === form.projectManagerId);
  const budget = Number(form.baselineBudget || 0);

  const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    {
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: "Type",
      value: form.projectType,
    },
    {
      icon: <User2 className="h-3.5 w-3.5" />,
      label: "Client",
      value: client?.name ?? <span className="text-muted-foreground/50">—</span>,
    },
    {
      icon: <Briefcase className="h-3.5 w-3.5" />,
      label: "PM",
      value: pm ? `${pm.user?.firstName ?? ""} ${pm.user?.lastName ?? ""}`.trim()
        : <span className="text-muted-foreground/50">—</span>,
    },
    {
      icon: <DollarSign className="h-3.5 w-3.5" />,
      label: "Budget",
      value: budget > 0 ? `$${budget.toLocaleString()}` : <span className="text-muted-foreground/50">—</span>,
    },
    {
      icon: <CalendarRange className="h-3.5 w-3.5" />,
      label: "Dates",
      value: form.startDate || form.endDate
        ? `${form.startDate || "?"} → ${form.endDate || "TBD"}`
        : <span className="text-muted-foreground/50">—</span>,
    },
    {
      icon: <MapPin className="h-3.5 w-3.5" />,
      label: "Site",
      value: form.siteAddress || <span className="text-muted-foreground/50">—</span>,
    },
    {
      icon: <Flag className="h-3.5 w-3.5" />,
      label: "Priority",
      value: <span className={`font-medium ${PRIORITY_COLORS[form.priority] ?? ""}`}>{form.priority}</span>,
    },
  ];

  return (
    <div className="sticky top-20 space-y-3">
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-primary/5 px-4 py-3 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
          <h3 className="text-base font-semibold mt-0.5 min-h-[1.5rem]">
            {form.name || <span className="text-muted-foreground/40 font-normal text-sm">Project name...</span>}
          </h3>
        </div>
        <div className="divide-y">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start gap-2.5 px-4 py-2.5">
              <span className="mt-0.5 text-muted-foreground shrink-0">{row.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">{row.label}</p>
                <p className="text-xs font-medium truncate">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTpl && (
        <div className="rounded-xl border bg-card px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template</p>
          <p className="text-sm font-medium">{selectedTpl.name}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{selectedTpl.stages.length} stages</span>
            <span>{selectedTpl.tasks.length} tasks</span>
            <span>{selectedTpl.budgetLines.length} budget lines</span>
          </div>
        </div>
      )}

      {form.members.length > 0 && (
        <div className="rounded-xl border bg-card px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team ({form.members.length})</p>
          <div className="space-y-1.5">
            {form.members.slice(0, 4).map((m) => (
              <div key={m.userId} className="flex items-center gap-2">
                <Avatar name={m.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{m.displayName}</p>
                  <p className="text-[10px] text-muted-foreground">{m.role}</p>
                </div>
              </div>
            ))}
            {form.members.length > 4 && (
              <p className="text-xs text-muted-foreground">+{form.members.length - 4} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { clients } = useAppSelector((s) => s.crm);
  const { items: employees } = useAppSelector((s) => s.employees);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(BLANK);
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<ProjectTemplate | null>(null);
  const [tplLoading, setTplLoading] = useState(false);
  const [company, setCompany] = useState<CompanyDetails | null>(null);

  // new member row
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  useEffect(() => {
    dispatch(fetchClients({ limit: 200 }));
    dispatch(fetchEmployees({ limit: 200 }));
    api.get<ProjectTemplate[]>("/project-templates").then(setTemplates).catch(() => {});
    api.get<CompanyDetails>("/companies/me").then(setCompany).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (!form.templateId) {
      setSelectedTpl(null);
      setForm((f) => ({ ...f, docChecklist: [] }));
      return;
    }
    setTplLoading(true);
    api.get<ProjectTemplate>(`/project-templates/${form.templateId}`)
      .then((tpl) => {
        setSelectedTpl(tpl);
        const docs: DocEntry[] = tpl.documents.map((d) => ({
          name: d.name, type: d.documentType, isRequired: d.isRequired, checked: false,
        }));
        if (docs.length === 0) docs.push(
          { name: "Contract", type: "CONTRACT", isRequired: true, checked: false },
          { name: "Drawings / Plans", type: "PLAN", isRequired: false, checked: false },
          { name: "Bill of Quantities", type: "OTHER", isRequired: false, checked: false },
          { name: "Site Photos", type: "PHOTO", isRequired: false, checked: false },
        );
        setForm((f) => ({ ...f, docChecklist: docs }));
      })
      .catch(() => {})
      .finally(() => setTplLoading(false));
  }, [form.templateId]);

  useEffect(() => {
    if (!form.templateId && form.docChecklist.length === 0) {
      setForm((f) => ({
        ...f,
        docChecklist: [
          { name: "Contract", type: "CONTRACT", isRequired: true, checked: false },
          { name: "Drawings / Plans", type: "PLAN", isRequired: false, checked: false },
          { name: "Bill of Quantities", type: "OTHER", isRequired: false, checked: false },
          { name: "Site Photos", type: "PHOTO", isRequired: false, checked: false },
        ],
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(patch: Partial<WizardState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  // ─── derived data ─────────────────────────────────────────────────────────

  const templateOptions: SearchableOption[] = [
    { value: "", label: "No template" },
    ...templates.map((t) => ({
      value: t.id,
      label: t.name,
      sublabel: t.constructionType ? t.constructionType : undefined,
    })),
  ];

  const clientOptions: SearchableOption[] = [
    { value: "", label: "No client" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: (c as unknown as { contactEmail?: string }).contactEmail,
    })),
  ];

  const pmOptions: SearchableOption[] = [
    { value: "", label: "No project manager" },
    ...employees.map((e) => ({
      value: e.userId,
      label: `${e.user?.firstName ?? ""} ${e.user?.lastName ?? ""}`.trim(),
      sublabel: e.jobTitle ?? undefined,
    })),
  ];

  const alreadyAdded = new Set(form.members.map((m) => m.userId));
  const memberOptions: SearchableOption[] = employees
    .filter((e) => !alreadyAdded.has(e.userId))
    .map((e) => ({
      value: e.userId,
      label: `${e.user?.firstName ?? ""} ${e.user?.lastName ?? ""}`.trim(),
      sublabel: e.jobTitle ?? undefined,
    }));

  const roleOptions = (company?.stakeholders && company.stakeholders.length > 0)
    ? company.stakeholders.map((s) => ({ code: s.type, name: s.name }))
    : FALLBACK_ROLES;

  // ─── member management ────────────────────────────────────────────────────

  function addMember() {
    if (!newMemberId) return;
    const emp = employees.find((e) => e.userId === newMemberId);
    if (!emp) return;
    const displayName = `${emp.user?.firstName ?? ""} ${emp.user?.lastName ?? ""}`.trim();
    setForm((f) => ({
      ...f,
      members: [...f.members, { userId: newMemberId, displayName, role: newMemberRole || "MEMBER" }],
    }));
    setNewMemberId("");
    setNewMemberRole("");
  }

  function removeMember(i: number) {
    setForm((f) => ({ ...f, members: f.members.filter((_, idx) => idx !== i) }));
  }

  function toggleStage(code: string) {
    setForm((f) => ({
      ...f,
      excludedStages: f.excludedStages.includes(code)
        ? f.excludedStages.filter((c) => c !== code)
        : [...f.excludedStages, code],
    }));
  }

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0 && Number(form.baselineBudget || 0) >= 0;
    return true;
  };

  async function handleCreate() {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description || undefined,
        projectType: form.projectType,
        clientId: form.clientId || undefined,
        projectManagerId: form.projectManagerId || undefined,
        siteAddress: form.siteAddress || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        baselineBudget: Number(form.baselineBudget || 0),
        priority: form.priority || undefined,
        templateId: form.templateId || undefined,
      };

      const project = await api.post<{ id: string }>("/projects", payload);

      for (const member of form.members) {
        try {
          await api.post(`/projects/${project.id}/members`, { userId: member.userId, role: member.role });
        } catch { /* non-fatal */ }
      }

      toast.success("Project created successfully");
      router.push(`/projects/${project.id}`);
    } catch {
      toast.error("Failed to create project");
    }
    setSubmitting(false);
  }

  // ─── step renders ──────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Project Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Sunrise Heights Phase 2"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Project Type</Label>
            <Select value={form.projectType} onValueChange={(v) => v && set({ projectType: v as ProjectType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Template</Label>
            <SearchableSelect
              value={form.templateId}
              onChange={(v) => set({ templateId: v })}
              options={templateOptions}
              placeholder={tplLoading ? "Loading…" : "Search templates…"}
              emptyText="No templates found"
              disabled={tplLoading}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Brief description of the project scope..."
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Client</Label>
            <SearchableSelect
              value={form.clientId}
              onChange={(v) => set({ clientId: v })}
              options={clientOptions}
              placeholder="Search clients…"
              emptyText="No clients found"
              showAvatar
            />
          </div>

          <div className="space-y-1.5">
            <Label>Project Manager</Label>
            <SearchableSelect
              value={form.projectManagerId}
              onChange={(v) => set({ projectManagerId: v })}
              options={pmOptions}
              placeholder="Search employees…"
              emptyText="No employees found"
              showAvatar
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Site Address</Label>
            <Input
              placeholder="e.g. 123 Main Street, Harare"
              value={form.siteAddress}
              onChange={(e) => set({ siteAddress: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <DatePickerField value={form.startDate || undefined} onChange={(v) => set({ startDate: v ?? "" })} />
          </div>

          <div className="space-y-1.5">
            <Label>End Date</Label>
            <DatePickerField value={form.endDate || undefined} onChange={(v) => set({ endDate: v ?? "" })} />
          </div>

          <div className="space-y-1.5">
            <Label>Baseline Budget (USD) <span className="text-destructive">*</span></Label>
            <Input
              type="number" min={0} step="0.01" placeholder="0.00"
              value={form.baselineBudget}
              onChange={(e) => set({ baselineBudget: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => v && set({ priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Review the documents that will be needed for this project. Upload actual files from the project page after creation.
        </p>
        {form.docChecklist.length === 0 ? (
          <p className="text-sm text-muted-foreground">No document requirements configured.</p>
        ) : (
          <div className="space-y-2">
            {form.docChecklist.map((doc, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={doc.checked}
                    onChange={(e) => {
                      const updated = [...form.docChecklist];
                      updated[i] = { ...updated[i], checked: e.target.checked };
                      set({ docChecklist: updated });
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {doc.name}
                      {doc.isRequired && <span className="text-destructive ml-1">*</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{doc.type}</p>
                  </div>
                </div>
                <Badge variant={doc.checked ? "default" : "secondary"} className="text-[10px]">
                  {doc.checked ? "Ready" : doc.isRequired ? "Required" : "Optional"}
                </Badge>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          <span className="text-destructive">*</span> Required documents
        </p>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-4">
        {selectedTpl?.roles && selectedTpl.roles.length > 0 && (
          <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested roles from template</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedTpl.roles.map((r) => (
                <Badge key={r.roleCode} variant={r.isRequired ? "default" : "secondary"} className="text-xs">
                  {r.roleCode}{r.isRequired ? " *" : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {form.members.length === 0 && (
            <p className="text-sm text-muted-foreground">No team members added. You can add members after project creation too.</p>
          )}
          {form.members.map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar name={m.displayName} size="md" />
                <div>
                  <p className="text-sm font-medium">{m.displayName}</p>
                  <p className="text-xs text-muted-foreground">{m.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMember(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        <div className="grid gap-3 sm:grid-cols-3">
          <SearchableSelect
            value={newMemberId}
            onChange={setNewMemberId}
            options={memberOptions}
            placeholder="Search employee…"
            emptyText="No employees found"
            showAvatar
          />
          <Select value={newMemberRole || "__none__"} onValueChange={(v) => setNewMemberRole(v && v !== "__none__" ? v : "")}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select role</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={addMember} disabled={!newMemberId}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    if (!selectedTpl) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No template selected. The project will be created with default stages based on the project type.
          </p>
        </div>
      );
    }

    const budget = Number(form.baselineBudget || 0);

    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Template</p>
          <p className="text-sm font-medium">{selectedTpl.name}</p>
          {selectedTpl.description && <p className="text-xs text-muted-foreground">{selectedTpl.description}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Stages ({selectedTpl.stages.length})
          </p>
          {selectedTpl.stages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No stages in template.</p>
          ) : (
            <div className="space-y-1.5">
              {[...selectedTpl.stages].sort((a, b) => a.stageOrder - b.stageOrder).map((s) => (
                <div key={s.workflowCode} className="flex items-center justify-between rounded border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!form.excludedStages.includes(s.workflowCode)}
                      onChange={() => toggleStage(s.workflowCode)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm">{s.workflowCode}</span>
                    {s.requiresApproval && <Badge variant="outline" className="text-[10px]">Approval required</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">#{s.stageOrder}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTpl.tasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Default Tasks ({selectedTpl.tasks.length})
            </p>
            <div className="space-y-1">
              {selectedTpl.tasks.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                  <StatusBadge status={t.priority} className="shrink-0" />
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.roleCode && <span className="text-xs text-muted-foreground shrink-0">{t.roleCode}</span>}
                </div>
              ))}
              {selectedTpl.tasks.length > 5 && (
                <p className="text-xs text-muted-foreground">+{selectedTpl.tasks.length - 5} more tasks</p>
              )}
            </div>
          </div>
        )}

        {selectedTpl.budgetLines.length > 0 && budget > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Budget Allocation (based on ${budget.toLocaleString()})
            </p>
            <div className="space-y-1.5">
              {selectedTpl.budgetLines.filter((b) => b.suggestedPct != null).map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm rounded border px-3 py-2">
                  <span>{b.categoryCode}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">{b.suggestedPct}%</span>
                    <span className="font-medium">${((budget * Number(b.suggestedPct)) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep5() {
    const client = clients.find((c) => c.id === form.clientId);
    const pm = employees.find((e) => e.userId === form.projectManagerId);

    return (
      <div className="space-y-4">
        <div className="rounded-lg border divide-y">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4">
            <div>
              <p className="text-xs text-muted-foreground">Project Name</p>
              <p className="text-sm font-semibold">{form.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium">{form.projectType}</p>
            </div>
            {form.templateId && (
              <div>
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium">{selectedTpl?.name ?? form.templateId}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Priority</p>
              <StatusBadge status={form.priority} />
            </div>
            {client && (
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="text-sm font-medium">{client.name}</p>
              </div>
            )}
            {pm && (
              <div>
                <p className="text-xs text-muted-foreground">Project Manager</p>
                <p className="text-sm font-medium">{pm.user?.firstName} {pm.user?.lastName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-sm font-semibold">${Number(form.baselineBudget || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Timeline</p>
              <p className="text-sm font-medium">{form.startDate || "—"} → {form.endDate || "TBD"}</p>
            </div>
          </div>

          {form.members.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2">Team ({form.members.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {form.members.map((m) => (
                  <Badge key={m.userId} variant="secondary" className="text-xs">{m.displayName} · {m.role}</Badge>
                ))}
              </div>
            </div>
          )}

          {selectedTpl && (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground">Will create</p>
              <p className="text-sm mt-1">
                {selectedTpl.stages.filter((s) => !form.excludedStages.includes(s.workflowCode)).length} stages
                {selectedTpl.tasks.length > 0 && `, ${selectedTpl.tasks.length} tasks`}
                {selectedTpl.budgetLines.filter((b) => b.suggestedPct != null).length > 0
                  && `, ${selectedTpl.budgetLines.filter((b) => b.suggestedPct != null).length} budget lines`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader title="New Project" description="Create a new construction project.">
        <Button variant="outline" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center">
              <div className={`flex flex-col items-center gap-1 ${i > 0 ? "ml-1" : ""}`}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors ${
                    done ? "bg-primary border-primary text-primary-foreground"
                    : active ? "border-primary text-primary bg-background"
                    : "border-muted-foreground/30 text-muted-foreground bg-background"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-[2px] w-8 mt-[-16px] ${i < step ? "bg-primary" : "bg-muted-foreground/20"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Two-column layout: step content + preview */}
      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {(() => { const Icon = STEPS[step].icon; return <Icon className="h-4 w-4 text-primary" />; })()}
                {STEPS[step].label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stepRenderers[step]()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => step === 0 ? router.push("/projects") : setStep((s) => s - 1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={submitting || !form.name.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Create Project
              </Button>
            )}
          </div>
        </div>

        {/* Live preview panel */}
        <div className="hidden lg:block">
          <PreviewPanel
            form={form}
            clients={clients}
            employees={employees}
            selectedTpl={selectedTpl}
          />
        </div>
      </div>
    </div>
  );
}
