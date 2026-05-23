"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Users, Shield, CreditCard, Pencil, X, Loader2,
  Upload, Check, MapPin, Globe, Phone, Mail, Hash, Briefcase,
  Settings2, Layers, UserCheck, GitBranch, LayoutTemplate,
  Plus, Trash2, Copy, ChevronRight, GitCommitHorizontal,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/hooks";
import type {
  CompanyDetails, CompanySettingsData, OnboardingSetupRequest, OnboardingOptions,
} from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── helpers ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: CompanySettingsData = {
  currency: "USD", taxRate: 15, taxName: "VAT",
  invoicePrefix: "INV", invoiceNextNumber: 1,
  quotePrefix: "QUO", quoteNextNumber: 1,
  purchaseOrderPrefix: "PO", purchaseOrderNext: 1,
  approvalRequired: false, notificationsEnabled: true,
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

function EditHeader({ label, onCancel, onSave, saving }: { label: string; onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>
    </div>
  );
}

// ─── template types ──────────────────────────────────────────────────────────

type TplStage = { workflowCode: string; stageOrder: number; requiresApproval: boolean; approvalRoles: string[] };
type TplTask  = { title: string; roleCode: string; stageWorkflowCode: string; priority: string; order: number };
type TplDoc   = { documentType: string; name: string; stageWorkflowCode: string; isRequired: boolean };
type TplRole  = { roleCode: string; isRequired: boolean };
type TplBudget = { categoryCode: string; suggestedPct: string };

type TplForm = {
  name: string;
  description: string;
  constructionType: string;
  isDefault: boolean;
  stages: TplStage[];
  tasks: TplTask[];
  documents: TplDoc[];
  roles: TplRole[];
  budgetLines: TplBudget[];
};

const BLANK_FORM: TplForm = {
  name: "", description: "", constructionType: "", isDefault: false,
  stages: [], tasks: [], documents: [], roles: [], budgetLines: [],
};

type ProjectTemplate = {
  id: string;
  name: string;
  description: string | null;
  constructionType: string | null;
  isDefault: boolean;
  isArchived: boolean;
  version: number;
  stages: TplStage[];
  roles: TplRole[];
  budgetLines: { categoryCode: string; suggestedPct: number | null }[];
  _count?: { tasks: number; documents: number };
};

// ─── main component ──────────────────────────────────────────────────────────

const navLinks = [
  { title: "Users & Invites", description: "Manage team members and send invitations", icon: Users, href: "/settings/users" },
  { title: "Roles & Permissions", description: "Configure access control for your team", icon: Shield, href: "/settings/roles" },
  { title: "Subscription & Billing", description: "Manage your plan and payment method", icon: CreditCard, href: "/settings/subscription" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { tenant } = useAuth();

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [setup, setSetup] = useState<OnboardingSetupRequest>({ selectedSectors: [], selectedProjectTypes: [], selectedStakeholders: [], selectedWorkflows: [] });
  const [options, setOptions] = useState<OnboardingOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // per-tab edit state
  const [editProfile, setEditProfile] = useState(false);
  const [editBusiness, setEditBusiness] = useState(false);
  const [editSectors, setEditSectors] = useState(false);
  const [editRoles, setEditRoles] = useState(false);
  const [editWorkflows, setEditWorkflows] = useState(false);
  const [editBizSettings, setEditBizSettings] = useState(false);

  // per-tab saving state
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [savingBizSettings, setSavingBizSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // form state
  const [profileForm, setProfileForm] = useState({ name: "", description: "", website: "", businessPhone: "", businessEmail: "", city: "", businessName: "", primarySector: "", businessSize: "" });
  const [bizForm, setBizForm] = useState({ legalName: "", registrationNumber: "", taxNumber: "", companySize: "", yearsOperating: "" });
  const [setupForm, setSetupForm] = useState<OnboardingSetupRequest>({ selectedSectors: [], selectedProjectTypes: [], selectedStakeholders: [], selectedWorkflows: [] });
  const [bizSettingsForm, setBizSettingsForm] = useState<CompanySettingsData>(DEFAULT_SETTINGS);

  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── template state ─────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplForm, setTplForm] = useState<TplForm>(BLANK_FORM);
  const [tplSaving, setTplSaving] = useState(false);

  // create-stage-from-template dialog
  const [newStageOpen, setNewStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageDesc, setNewStageDesc] = useState("");
  const [creatingStage, setCreatingStage] = useState(false);

  // merged list: company's enabled workflows + all options (de-duped by code)
  const availableWorkflows = (() => {
    const companyWfs = company?.workflows ?? [];
    const optionWfs = options?.workflows ?? [];
    const byCode = new Map<string, { code: string; name: string; description?: string; isCustom?: boolean }>();
    optionWfs.forEach((w) => byCode.set(w.code, w));
    companyWfs.forEach((w) => byCode.set(w.code, { code: w.code, name: w.name, description: w.description, isCustom: !optionWfs.find((o) => o.code === w.code) }));
    return Array.from(byCode.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [comp, s] = await Promise.all([
        api.get<CompanyDetails>("/companies/me"),
        api.get<OnboardingSetupRequest>("/onboarding/setup"),
      ]);
      setCompany(comp);
      setSetup(s);
      setSetupForm(s);
    } catch { /* handled */ }
    setIsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    api.get<OnboardingOptions>("/onboarding/options").then(setOptions).catch(() => {});
  }, []);

  // Sync form state when company data loads
  useEffect(() => {
    if (!company) return;
    const ip = company.individualProfile;
    setProfileForm({
      name: company.name ?? "",
      description: company.description ?? ip?.description ?? "",
      website: company.website ?? "",
      businessPhone: company.businessPhone ?? ip?.phone ?? "",
      businessEmail: company.businessEmail ?? ip?.businessEmail ?? "",
      city: company.city ?? ip?.city ?? "",
      businessName: ip?.businessName ?? "",
      primarySector: ip?.primarySector ?? "",
      businessSize: ip?.businessSize ?? "",
    });
    setBizForm({
      legalName: company.legalName ?? "",
      registrationNumber: company.registrationNumber ?? ip?.registrationNumber ?? "",
      taxNumber: company.taxNumber ?? ip?.taxNumber ?? "",
      companySize: company.companySize ?? "",
      yearsOperating: String(company.yearsOperating ?? ip?.yearsOperating ?? ""),
    });
    setBizSettingsForm({ ...DEFAULT_SETTINGS, ...company.settings });
  }, [company]);

  // ── saves ────────────────────────────────────────────────────────────────

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const isInd = company?.accountType === "INDIVIDUAL";
      const payload: Record<string, unknown> = {
        name: profileForm.name,
        description: profileForm.description,
        website: profileForm.website,
        businessPhone: profileForm.businessPhone,
        businessEmail: profileForm.businessEmail,
        city: profileForm.city,
      };
      if (isInd) {
        payload.individualProfile = {
          businessName: profileForm.businessName,
          primarySector: profileForm.primarySector,
          businessSize: profileForm.businessSize,
          description: profileForm.description,
          businessEmail: profileForm.businessEmail,
          city: profileForm.city,
        };
      }
      const updated = await api.patch<CompanyDetails>("/companies/me", payload);
      setCompany(updated);
      setEditProfile(false);
    } catch { /* handled */ }
    setSavingProfile(false);
  }

  async function saveBusiness() {
    setSavingBusiness(true);
    try {
      const isInd = company?.accountType === "INDIVIDUAL";
      const payload: Record<string, unknown> = {
        legalName: bizForm.legalName,
        registrationNumber: bizForm.registrationNumber,
        taxNumber: bizForm.taxNumber,
        companySize: bizForm.companySize,
        yearsOperating: bizForm.yearsOperating ? Number(bizForm.yearsOperating) : undefined,
      };
      if (isInd) {
        payload.individualProfile = {
          registrationNumber: bizForm.registrationNumber,
          taxNumber: bizForm.taxNumber,
          yearsOperating: bizForm.yearsOperating ? Number(bizForm.yearsOperating) : undefined,
        };
      }
      const updated = await api.patch<CompanyDetails>("/companies/me", payload);
      setCompany(updated);
      setEditBusiness(false);
    } catch { /* handled */ }
    setSavingBusiness(false);
  }

  async function saveSetup() {
    setSavingSetup(true);
    try {
      await api.post("/onboarding/setup", setupForm);
      setSetup(setupForm);
      setEditSectors(false);
      setEditRoles(false);
      setEditWorkflows(false);
      await load();
    } catch { /* handled */ }
    setSavingSetup(false);
  }

  async function saveBizSettings() {
    setSavingBizSettings(true);
    try {
      const updated = await api.patch<CompanyDetails>("/companies/me", { settings: bizSettingsForm });
      setCompany(updated);
      setEditBizSettings(false);
    } catch { /* handled */ }
    setSavingBizSettings(false);
  }

  async function loadTemplates() {
    setTplLoading(true);
    try {
      const data = await api.get<ProjectTemplate[]>("/project-templates");
      setTemplates(data);
    } catch { /* handled */ }
    setTplLoading(false);
  }

  function openCreateTemplate() {
    setEditingTplId(null);
    setTplForm(BLANK_FORM);
    setTplDialogOpen(true);
  }

  async function openEditTemplate(id: string) {
    try {
      const tpl = await api.get<ProjectTemplate & { tasks: TplTask[]; documents: TplDoc[] }>(`/project-templates/${id}`);
      setEditingTplId(id);
      setTplForm({
        name: tpl.name,
        description: tpl.description ?? "",
        constructionType: tpl.constructionType ?? "",
        isDefault: tpl.isDefault,
        stages: tpl.stages.map((s) => ({ workflowCode: s.workflowCode, stageOrder: s.stageOrder, requiresApproval: s.requiresApproval, approvalRoles: s.approvalRoles ?? [] })),
        tasks: tpl.tasks ?? [],
        documents: tpl.documents ?? [],
        roles: tpl.roles ?? [],
        budgetLines: (tpl.budgetLines ?? []).map((b) => ({ categoryCode: b.categoryCode, suggestedPct: b.suggestedPct != null ? String(b.suggestedPct) : "" })),
      });
      setTplDialogOpen(true);
    } catch { /* handled */ }
  }

  async function saveTpl() {
    setTplSaving(true);
    try {
      const payload = {
        ...tplForm,
        constructionType: tplForm.constructionType || undefined,
        budgetLines: tplForm.budgetLines.map((b) => ({ categoryCode: b.categoryCode, suggestedPct: b.suggestedPct ? Number(b.suggestedPct) : undefined })),
      };
      if (editingTplId) {
        await api.patch(`/project-templates/${editingTplId}`, payload);
      } else {
        await api.post("/project-templates", payload);
      }
      setTplDialogOpen(false);
      await loadTemplates();
    } catch { /* handled */ }
    setTplSaving(false);
  }

  async function duplicateTpl(id: string) {
    try {
      await api.post(`/project-templates/${id}/duplicate`, {});
      await loadTemplates();
    } catch { /* handled */ }
  }

  async function archiveTpl(id: string) {
    try {
      await api.delete(`/project-templates/${id}`);
      await loadTemplates();
    } catch { /* handled */ }
  }

  function addTplStage() {
    setTplForm((f) => ({
      ...f,
      stages: [...f.stages, { workflowCode: "", stageOrder: f.stages.length + 1, requiresApproval: false, approvalRoles: [] }],
    }));
  }

  function removeTplStage(i: number) {
    setTplForm((f) => ({ ...f, stages: f.stages.filter((_, idx) => idx !== i) }));
  }

  function addTplTask() {
    setTplForm((f) => ({
      ...f,
      tasks: [...f.tasks, { title: "", roleCode: "", stageWorkflowCode: "", priority: "MEDIUM", order: f.tasks.length }],
    }));
  }

  function removeTplTask(i: number) {
    setTplForm((f) => ({ ...f, tasks: f.tasks.filter((_, idx) => idx !== i) }));
  }

  function addTplBudgetLine() {
    setTplForm((f) => ({ ...f, budgetLines: [...f.budgetLines, { categoryCode: "", suggestedPct: "" }] }));
  }

  function removeTplBudgetLine(i: number) {
    setTplForm((f) => ({ ...f, budgetLines: f.budgetLines.filter((_, idx) => idx !== i) }));
  }

  function addTplRole() {
    setTplForm((f) => ({ ...f, roles: [...f.roles, { roleCode: "", isRequired: false }] }));
  }

  function removeTplRole(i: number) {
    setTplForm((f) => ({ ...f, roles: f.roles.filter((_, idx) => idx !== i) }));
  }

  async function handleCreateWorkflowStage(autoAddToTemplate?: boolean) {
    if (!newStageName.trim()) return;
    setCreatingStage(true);
    try {
      const created = await api.post<{ code: string; name: string }>("/companies/me/workflow-stages", {
        name: newStageName.trim(),
        description: newStageDesc.trim() || undefined,
      });
      // Refresh company data so the new stage appears in future dropdowns
      const updated = await api.get<typeof company>("/companies/me");
      setCompany(updated as typeof company);
      if (autoAddToTemplate) {
        setTplForm((f) => ({
          ...f,
          stages: [...f.stages, { workflowCode: created.code, stageOrder: f.stages.length + 1, requiresApproval: false, approvalRoles: [] }],
        }));
      }
      setNewStageOpen(false);
      setNewStageName("");
      setNewStageDesc("");
    } catch { /* handled */ }
    setCreatingStage(false);
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3005/api/v1";
      const token = typeof window !== "undefined" ? localStorage.getItem("bp_access_token") : null;
      const slug = typeof window !== "undefined" ? localStorage.getItem("bp_tenant_slug") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (slug) headers["x-tenant-slug"] = slug;
      const httpRes = await fetch(`${apiBase}/companies/me/logo`, { method: "POST", headers, body: fd });
      if (httpRes.ok) {
        const res = await httpRes.json() as { logoUrl: string };
        setCompany((prev) => prev ? { ...prev, logoUrl: res.logoUrl } : prev);
      }
    } catch { /* handled */ }
    setUploadingLogo(false);
  }

  function toggleSetupCode(field: keyof OnboardingSetupRequest, code: string) {
    setSetupForm((prev) => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(code) ? arr.filter((c) => c !== code) : [...arr, code] };
    });
  }

  // ── loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isIndividual = company?.accountType === "INDIVIDUAL";
  const logoFallback = (company?.name ?? tenant?.name ?? "BP").slice(0, 2).toUpperCase();

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Settings" description="Manage your company profile and workspace configuration." />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="business" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Business Details</TabsTrigger>
          <TabsTrigger value="sectors" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> Sectors & Types</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Team Roles</TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Workflows</TabsTrigger>
          <TabsTrigger value="bizsettings" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Business Settings</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5" onClick={loadTemplates}><LayoutTemplate className="h-3.5 w-3.5" /> Templates</TabsTrigger>
        </TabsList>

        {/* ──── Profile tab ──── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Company Profile</CardTitle>
                <CardDescription>Logo, name, and contact information</CardDescription>
              </div>
              {!editProfile && (
                <Button variant="outline" size="sm" onClick={() => setEditProfile(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-2 ring-border">
                    <AvatarImage src={company?.logoUrl ?? undefined} />
                    <AvatarFallback className="text-lg font-bold">{logoFallback}</AvatarFallback>
                  </Avatar>
                  {uploadingLogo && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{company?.name}</p>
                  <p className="text-xs text-muted-foreground">{company?.slug}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadingLogo ? "Uploading…" : "Change Logo"}
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              <Separator />

              {editProfile ? (
                <>
                  <EditHeader label="Editing profile" onCancel={() => setEditProfile(false)} onSave={saveProfile} saving={savingProfile} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {isIndividual ? (
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Business Name</Label>
                        <Input value={profileForm.businessName} onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })} />
                      </div>
                    ) : (
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Company Name</Label>
                        <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                      </div>
                    )}
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Description</Label>
                      <Textarea rows={3} value={profileForm.description} onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Phone</Label>
                      <Input value={profileForm.businessPhone} onChange={(e) => setProfileForm({ ...profileForm, businessPhone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Email</Label>
                      <Input type="email" value={profileForm.businessEmail} onChange={(e) => setProfileForm({ ...profileForm, businessEmail: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={profileForm.website} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                    </div>
                    {isIndividual && (
                      <>
                        <div className="space-y-2">
                          <Label>Primary Sector</Label>
                          <Input value={profileForm.primarySector} onChange={(e) => setProfileForm({ ...profileForm, primarySector: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Business Size</Label>
                          <Select value={profileForm.businessSize} onValueChange={(v) => v && setProfileForm({ ...profileForm, businessSize: v })}>
                            <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                            <SelectContent>
                              {["1-3", "4-10", "10-20"].map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {isIndividual && <Field label="Business Name" value={company?.individualProfile?.businessName} />}
                  {!isIndividual && <Field label="Company Name" value={company?.name} />}
                  <Field label="Description" value={company?.description ?? company?.individualProfile?.description} />
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Field label="Business Phone" value={company?.businessPhone ?? company?.individualProfile?.phone} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Field label="Business Email" value={company?.businessEmail ?? company?.individualProfile?.businessEmail} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Field label="Website" value={company?.website} />
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Field label="City" value={company?.city ?? company?.individualProfile?.city} />
                  </div>
                  {isIndividual && (
                    <>
                      <Field label="Primary Sector" value={company?.individualProfile?.primarySector} />
                      <Field label="Business Size" value={company?.individualProfile?.businessSize} />
                    </>
                  )}
                  <Field label="Account Type" value={company?.accountType} />
                  <Field label="Slug" value={company?.slug} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Business Details tab ──── */}
        <TabsContent value="business">
          <Card>
            <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Business Details</CardTitle>
                <CardDescription>Legal and registration information</CardDescription>
              </div>
              {!editBusiness && (
                <Button variant="outline" size="sm" onClick={() => setEditBusiness(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editBusiness ? (
                <>
                  <EditHeader label="Editing business details" onCancel={() => setEditBusiness(false)} onSave={saveBusiness} saving={savingBusiness} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {!isIndividual && (
                      <>
                        <div className="space-y-2">
                          <Label>Legal Name</Label>
                          <Input value={bizForm.legalName} onChange={(e) => setBizForm({ ...bizForm, legalName: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Company Size</Label>
                          <Select value={bizForm.companySize} onValueChange={(v) => v && setBizForm({ ...bizForm, companySize: v })}>
                            <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                            <SelectContent>
                              {["MICRO", "SMALL", "MEDIUM", "LARGE"].map((s) => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label>Registration Number</Label>
                      <Input value={bizForm.registrationNumber} onChange={(e) => setBizForm({ ...bizForm, registrationNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Number</Label>
                      <Input value={bizForm.taxNumber} onChange={(e) => setBizForm({ ...bizForm, taxNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Years Operating</Label>
                      <Input type="number" min={0} value={bizForm.yearsOperating} onChange={(e) => setBizForm({ ...bizForm, yearsOperating: e.target.value })} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {!isIndividual && (
                    <>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Field label="Legal Name" value={company?.legalName} />
                      </div>
                      <Field label="Company Size" value={company?.companySize} />
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Field label="Registration Number" value={company?.registrationNumber ?? company?.individualProfile?.registrationNumber} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Field label="Tax Number" value={company?.taxNumber ?? company?.individualProfile?.taxNumber} />
                  </div>
                  <Field label="Years Operating" value={company?.yearsOperating ?? company?.individualProfile?.yearsOperating} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Sectors & Types tab ──── */}
        <TabsContent value="sectors">
          <Card>
            <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Sectors & Project Types</CardTitle>
                <CardDescription>Construction sectors and types of work you handle</CardDescription>
              </div>
              {!editSectors && (
                <Button variant="outline" size="sm" onClick={() => { setSetupForm(setup); setEditSectors(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editSectors ? (
                <>
                  <EditHeader label="Editing sectors & types" onCancel={() => setEditSectors(false)} onSave={saveSetup} saving={savingSetup} />
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Sectors</p>
                      <div className="grid gap-2">
                        {(options?.sectors ?? []).map((s) => (
                          <label key={s.code} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={setupForm.selectedSectors.includes(s.code)}
                              onCheckedChange={() => toggleSetupCode("selectedSectors", s.code)}
                            />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Project Types</p>
                      <div className="grid gap-2">
                        {(options?.projectTypes ?? []).map((t) => (
                          <label key={t.code} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={setupForm.selectedProjectTypes.includes(t.code)}
                              onCheckedChange={() => toggleSetupCode("selectedProjectTypes", t.code)}
                            />
                            <span className="text-sm">{t.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Sectors</p>
                    {company?.sectors.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {company.sectors.map((s) => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">None configured</p>}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Project Types</p>
                    {company?.projectTypes.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {company.projectTypes.map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">None configured</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Team Roles tab ──── */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Team Roles</CardTitle>
                <CardDescription>Stakeholder types and their auto-created system roles</CardDescription>
              </div>
              {!editRoles && (
                <Button variant="outline" size="sm" onClick={() => { setSetupForm(setup); setEditRoles(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editRoles ? (
                <>
                  <EditHeader label="Editing team roles" onCancel={() => setEditRoles(false)} onSave={saveSetup} saving={savingSetup} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(options?.stakeholders ?? []).map((s) => (
                      <label key={s.code} className="flex items-start gap-2 cursor-pointer rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                        <Checkbox
                          className="mt-0.5"
                          checked={setupForm.selectedStakeholders.includes(s.code)}
                          onCheckedChange={() => toggleSetupCode("selectedStakeholders", s.code)}
                        />
                        <div>
                          <p className="text-sm font-medium leading-none">{s.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {company?.stakeholders.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {company.stakeholders.map((sh) => (
                        <div key={sh.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-sm font-medium">{sh.name}</span>
                          {sh.role && <Badge variant="outline" className="text-xs">{sh.role.name}</Badge>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No stakeholders configured</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Workflows tab ──── */}
        <TabsContent value="workflows">
          <Card>
            <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Workflow Templates</CardTitle>
                <CardDescription>Project lifecycle workflows enabled for your workspace</CardDescription>
              </div>
              {!editWorkflows && (
                <Button variant="outline" size="sm" onClick={() => { setSetupForm(setup); setEditWorkflows(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editWorkflows ? (
                <>
                  <EditHeader label="Editing workflows" onCancel={() => setEditWorkflows(false)} onSave={saveSetup} saving={savingSetup} />
                  <div className="flex justify-end mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allCodes = (options?.workflows ?? []).map((w) => w.code);
                        setSetupForm((prev) => ({ ...prev, selectedWorkflows: allCodes }));
                      }}
                    >
                      Enable All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(options?.workflows ?? []).map((w) => (
                      <div key={w.code} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-muted-foreground">{w.description}</p>
                        </div>
                        <Switch
                          checked={setupForm.selectedWorkflows.includes(w.code)}
                          onCheckedChange={() => toggleSetupCode("selectedWorkflows", w.code)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {company?.workflows.length ? (
                    company.workflows.map((wf) => (
                      <div key={wf.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{wf.name}</p>
                          {Array.isArray(wf.stages) && (
                            <p className="text-xs text-muted-foreground">{wf.stages.length} stages</p>
                          )}
                        </div>
                        <Badge variant={wf.isEnabled ? "default" : "secondary"}>
                          {wf.isEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    ))
                  ) : <p className="text-sm text-muted-foreground">No workflows configured</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Business Settings tab ──── */}
        <TabsContent value="bizsettings">
          <Card>
            <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Business Settings</CardTitle>
                <CardDescription>Currency, tax, and document numbering</CardDescription>
              </div>
              {!editBizSettings && (
                <Button variant="outline" size="sm" onClick={() => setEditBizSettings(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editBizSettings ? (
                <>
                  <EditHeader label="Editing business settings" onCancel={() => setEditBizSettings(false)} onSave={saveBizSettings} saving={savingBizSettings} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={bizSettingsForm.currency} onValueChange={(v) => v && setBizSettingsForm({ ...bizSettingsForm, currency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["USD", "ZWG", "ZAR", "EUR", "GBP"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Name</Label>
                      <Input value={bizSettingsForm.taxName} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, taxName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input type="number" min={0} max={100} value={bizSettingsForm.taxRate} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, taxRate: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2" />
                    <div className="space-y-2">
                      <Label>Invoice Prefix</Label>
                      <Input value={bizSettingsForm.invoicePrefix} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, invoicePrefix: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Next #</Label>
                      <Input type="number" min={1} value={bizSettingsForm.invoiceNextNumber} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, invoiceNextNumber: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quote Prefix</Label>
                      <Input value={bizSettingsForm.quotePrefix} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, quotePrefix: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quote Next #</Label>
                      <Input type="number" min={1} value={bizSettingsForm.quoteNextNumber} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, quoteNextNumber: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Order Prefix</Label>
                      <Input value={bizSettingsForm.purchaseOrderPrefix} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, purchaseOrderPrefix: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>PO Next #</Label>
                      <Input type="number" min={1} value={bizSettingsForm.purchaseOrderNext} onChange={(e) => setBizSettingsForm({ ...bizSettingsForm, purchaseOrderNext: Number(e.target.value) })} />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Switch checked={bizSettingsForm.approvalRequired} onCheckedChange={(v) => setBizSettingsForm({ ...bizSettingsForm, approvalRequired: v })} />
                      <Label className="cursor-pointer">Require approvals</Label>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Switch checked={bizSettingsForm.notificationsEnabled} onCheckedChange={(v) => setBizSettingsForm({ ...bizSettingsForm, notificationsEnabled: v })} />
                      <Label className="cursor-pointer">Notifications enabled</Label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Currency" value={company?.settings?.currency ?? DEFAULT_SETTINGS.currency} />
                  <Field label="Tax" value={`${company?.settings?.taxRate ?? DEFAULT_SETTINGS.taxRate}% ${company?.settings?.taxName ?? DEFAULT_SETTINGS.taxName}`} />
                  <Field label="Invoice" value={`${company?.settings?.invoicePrefix ?? DEFAULT_SETTINGS.invoicePrefix}-${String(company?.settings?.invoiceNextNumber ?? DEFAULT_SETTINGS.invoiceNextNumber).padStart(4, "0")}`} />
                  <Field label="Quote" value={`${company?.settings?.quotePrefix ?? DEFAULT_SETTINGS.quotePrefix}-${String(company?.settings?.quoteNextNumber ?? DEFAULT_SETTINGS.quoteNextNumber).padStart(4, "0")}`} />
                  <Field label="Purchase Order" value={`${company?.settings?.purchaseOrderPrefix ?? DEFAULT_SETTINGS.purchaseOrderPrefix}-${String(company?.settings?.purchaseOrderNext ?? DEFAULT_SETTINGS.purchaseOrderNext).padStart(4, "0")}`} />
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Flags</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={(company?.settings?.approvalRequired ?? DEFAULT_SETTINGS.approvalRequired) ? "default" : "secondary"}>
                        {(company?.settings?.approvalRequired ?? DEFAULT_SETTINGS.approvalRequired) ? "Approvals ON" : "Approvals OFF"}
                      </Badge>
                      <Badge variant={(company?.settings?.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled) ? "default" : "secondary"}>
                        {(company?.settings?.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled) ? "Notifications ON" : "Notifications OFF"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Templates tab ──── */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-3 flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Project Templates</CardTitle>
                <CardDescription>Reusable templates with stages, tasks, budget lines and roles</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateTemplate}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Template
              </Button>
            </CardHeader>
            <CardContent>
              {tplLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <LayoutTemplate className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No templates yet</p>
                  <p className="text-xs text-muted-foreground">Create a template to speed up project creation with pre-built stages, tasks and budgets.</p>
                  <Button size="sm" className="mt-2" onClick={openCreateTemplate}><Plus className="h-3.5 w-3.5 mr-1" /> Create First Template</Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight truncate">{tpl.name}</p>
                          {tpl.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTemplate(tpl.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTpl(tpl.id)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => archiveTpl(tpl.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tpl.constructionType && <Badge variant="outline" className="text-[10px]">{tpl.constructionType}</Badge>}
                        {tpl.isDefault && <Badge className="text-[10px]">Default</Badge>}
                        <Badge variant="secondary" className="text-[10px]">{tpl.stages.length} stages</Badge>
                        {tpl._count && <Badge variant="secondary" className="text-[10px]">{tpl._count.tasks} tasks</Badge>}
                        <Badge variant="secondary" className="text-[10px]">v{tpl.version}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ──── Template Builder Dialog ──── */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTplId ? "Edit Template" : "New Project Template"}</DialogTitle>
            <DialogDescription>Define the stages, tasks, budget allocations and roles for this template.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic Info</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Template Name *</Label>
                  <Input placeholder="e.g. Standard Residential Build" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={2} placeholder="What type of projects is this template for?" value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Construction Type</Label>
                  <Input placeholder="e.g. HOUSE, RENOVATION, COMMERCIAL" value={tplForm.constructionType} onChange={(e) => setTplForm({ ...tplForm, constructionType: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch checked={tplForm.isDefault} onCheckedChange={(v) => setTplForm({ ...tplForm, isDefault: v })} />
                  <Label>Mark as default template</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stages</p>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewStageOpen(true)}
                    className="text-muted-foreground"
                  >
                    <GitCommitHorizontal className="h-3.5 w-3.5 mr-1" /> New Stage
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addTplStage}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Stage
                  </Button>
                </div>
              </div>
              {tplForm.stages.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No stages added. Select from your company&apos;s workflow stages or create a new one.
                </p>
              )}
              <div className="space-y-2">
                {tplForm.stages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <div className="flex-1 grid gap-2 sm:grid-cols-3">
                      <Select
                        value={stage.workflowCode || "__none__"}
                        onValueChange={(v) => {
                          const updated = [...tplForm.stages];
                          updated[i] = { ...updated[i], workflowCode: v && v !== "__none__" ? v : "" };
                          setTplForm({ ...tplForm, stages: updated });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select stage…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableWorkflows.length === 0 && (
                            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                              No workflow stages configured yet.
                            </div>
                          )}
                          {availableWorkflows.map((wf) => (
                            <SelectItem key={wf.code} value={wf.code} className="text-xs">
                              <span>{wf.name}</span>
                              {wf.isCustom && (
                                <span className="ml-1.5 text-[10px] text-muted-foreground">(custom)</span>
                              )}
                            </SelectItem>
                          ))}
                          <div className="border-t mt-1 pt-1">
                            <button
                              type="button"
                              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-primary hover:bg-accent rounded-sm"
                              onClick={() => setNewStageOpen(true)}
                            >
                              <Plus className="h-3 w-3" /> Create new stage…
                            </button>
                          </div>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Order"
                        className="h-8 text-xs"
                        value={stage.stageOrder}
                        onChange={(e) => {
                          const updated = [...tplForm.stages];
                          updated[i] = { ...updated[i], stageOrder: Number(e.target.value) };
                          setTplForm({ ...tplForm, stages: updated });
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={stage.requiresApproval}
                          onCheckedChange={(v) => {
                            const updated = [...tplForm.stages];
                            updated[i] = { ...updated[i], requiresApproval: v };
                            setTplForm({ ...tplForm, stages: updated });
                          }}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Needs approval</span>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeTplStage(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default Tasks</p>
                <Button type="button" variant="outline" size="sm" onClick={addTplTask}><Plus className="h-3.5 w-3.5 mr-1" /> Add Task</Button>
              </div>
              {tplForm.tasks.length === 0 && <p className="text-xs text-muted-foreground">No default tasks. Tasks will be created for every project using this template.</p>}
              <div className="space-y-2">
                {tplForm.tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <div className="flex-1 grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Task title"
                        value={task.title}
                        onChange={(e) => {
                          const updated = [...tplForm.tasks];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setTplForm({ ...tplForm, tasks: updated });
                        }}
                      />
                      <Select
                        value={task.stageWorkflowCode || "__none__"}
                        onValueChange={(v) => {
                          const updated = [...tplForm.tasks];
                          updated[i] = { ...updated[i], stageWorkflowCode: v && v !== "__none__" ? v : "" };
                          setTplForm({ ...tplForm, tasks: updated });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Assign to stage (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">No stage</SelectItem>
                          {tplForm.stages
                            .filter((s) => s.workflowCode)
                            .map((s) => {
                              const wf = availableWorkflows.find((w) => w.code === s.workflowCode);
                              return (
                                <SelectItem key={s.workflowCode} value={s.workflowCode} className="text-xs">
                                  {wf?.name ?? s.workflowCode}
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                      <Select
                        value={task.roleCode || "__none__"}
                        onValueChange={(v) => {
                          const updated = [...tplForm.tasks];
                          updated[i] = { ...updated[i], roleCode: v !== "__none__" ? v : "" };
                          setTplForm({ ...tplForm, tasks: updated });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Assigned role (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground">No role</SelectItem>
                          {(company?.stakeholders ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.type} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={task.priority}
                        onValueChange={(v) => v && (() => { const u = [...tplForm.tasks]; u[i] = { ...u[i], priority: v }; setTplForm({ ...tplForm, tasks: u }); })()}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeTplTask(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Budget Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget Allocation</p>
                <Button type="button" variant="outline" size="sm" onClick={addTplBudgetLine}><Plus className="h-3.5 w-3.5 mr-1" /> Add Line</Button>
              </div>
              {tplForm.budgetLines.length === 0 && <p className="text-xs text-muted-foreground">No budget lines. Add budget lines to pre-allocate portions of the total budget.</p>}
              <div className="space-y-2">
                {tplForm.budgetLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Category code (e.g. LABOUR)"
                      value={line.categoryCode}
                      onChange={(e) => {
                        const updated = [...tplForm.budgetLines];
                        updated[i] = { ...updated[i], categoryCode: e.target.value };
                        setTplForm({ ...tplForm, budgetLines: updated });
                      }}
                    />
                    <div className="flex items-center gap-1 w-28">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="%"
                        value={line.suggestedPct}
                        onChange={(e) => {
                          const updated = [...tplForm.budgetLines];
                          updated[i] = { ...updated[i], suggestedPct: e.target.value };
                          setTplForm({ ...tplForm, budgetLines: updated });
                        }}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTplBudgetLine(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Roles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested Roles</p>
                <Button type="button" variant="outline" size="sm" onClick={addTplRole}><Plus className="h-3.5 w-3.5 mr-1" /> Add Role</Button>
              </div>
              {tplForm.roles.length === 0 && <p className="text-xs text-muted-foreground">No roles. Roles are shown as suggestions when adding team members during project creation.</p>}
              <div className="space-y-2">
                {tplForm.roles.map((role, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={role.roleCode || "__none__"}
                      onValueChange={(v) => {
                        const updated = [...tplForm.roles];
                        updated[i] = { ...updated[i], roleCode: v !== "__none__" ? v : "" };
                        setTplForm({ ...tplForm, roles: updated });
                      }}
                    >
                      <SelectTrigger className="flex-1 text-xs">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs text-muted-foreground">Select role…</SelectItem>
                        {(company?.stakeholders ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.type} className="text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={role.isRequired}
                        onCheckedChange={(v) => {
                          const updated = [...tplForm.roles];
                          updated[i] = { ...updated[i], isRequired: v };
                          setTplForm({ ...tplForm, roles: updated });
                        }}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Required</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTplRole(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialogOpen(false)} disabled={tplSaving}>Cancel</Button>
            <Button onClick={saveTpl} disabled={tplSaving || !tplForm.name.trim()}>
              {tplSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              {editingTplId ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Create Workflow Stage Dialog ──── */}
      <Dialog open={newStageOpen} onOpenChange={(open) => { setNewStageOpen(open); if (!open) { setNewStageName(""); setNewStageDesc(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Workflow Stage</DialogTitle>
            <DialogDescription>
              Add a custom stage to your company&apos;s workflow catalogue. It will be available in all template builders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Stage Name *</Label>
              <Input
                placeholder="e.g. Site Inspection, Drainage Works…"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkflowStage(true)}
                autoFocus
              />
              {newStageName.trim() && (
                <p className="text-[10px] text-muted-foreground">
                  Code: <span className="font-mono">{newStageName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="Brief description of this stage"
                value={newStageDesc}
                onChange={(e) => setNewStageDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setNewStageOpen(false)} disabled={creatingStage}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateWorkflowStage(tplDialogOpen)}
              disabled={!newStageName.trim() || creatingStage}
            >
              {creatingStage ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              {tplDialogOpen ? "Create & Add to Template" : "Create Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Navigation cards ── */}
      <Separator />
      <div className="grid gap-4 sm:grid-cols-3">
        {navLinks.map((link) => (
          <Card
            key={link.href}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
            onClick={() => router.push(link.href)}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <link.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">{link.title}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{link.description}</CardDescription>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
