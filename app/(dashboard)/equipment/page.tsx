"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wrench, Plus, Loader2, X, AlertCircle, CheckCircle2,
  Clock, HardHat, Archive, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";

type EquipmentStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "RETIRED";

interface EquipmentCategory {
  id: string;
  name: string;
  _count?: { equipment: number };
}

interface Allocation {
  id: string;
  startDate: string;
  endDate?: string;
  returnedAt?: string;
  notes?: string;
  project: { id: string; name: string };
  allocatedBy: { id: string; firstName: string; lastName: string };
}

interface Equipment {
  id: string;
  name: string;
  description?: string;
  serialNumber?: string;
  status: EquipmentStatus;
  dailyRate?: number;
  purchaseCost?: number;
  purchasedAt?: string;
  createdAt: string;
  category?: { id: string; name: string };
  allocations?: Allocation[];
  _count?: { allocations: number };
}

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; variant: string; icon: React.ElementType }> = {
  AVAILABLE: { label: "Available", variant: "outline", icon: CheckCircle2 },
  IN_USE: { label: "In Use", variant: "default", icon: HardHat },
  MAINTENANCE: { label: "Maintenance", variant: "secondary", icon: AlertCircle },
  RETIRED: { label: "Retired", variant: "destructive", icon: Archive },
};

export default function EquipmentPage() {
  const dispatch = useAppDispatch();
  const { items: projects } = useAppSelector((s) => s.projects);

  const [activeTab, setActiveTab] = useState("equipment");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [search, setSearch] = useState("");

  // Selected equipment for detail/allocate
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);

  // Add equipment form
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newStatus, setNewStatus] = useState<EquipmentStatus>("AVAILABLE");
  const [newDailyRate, setNewDailyRate] = useState("");
  const [newPurchaseCost, setNewPurchaseCost] = useState("");
  const [newPurchasedAt, setNewPurchasedAt] = useState("");

  // Allocate form
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocProjectId, setAllocProjectId] = useState("");
  const [allocStart, setAllocStart] = useState(new Date().toISOString().split("T")[0]);
  const [allocEnd, setAllocEnd] = useState("");
  const [allocNotes, setAllocNotes] = useState("");
  const [allocating, setAllocating] = useState(false);

  // Add category form
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const loadEquipment = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (filterStatus) params.status = filterStatus;
      if (filterCategoryId) params.categoryId = filterCategoryId;
      if (search) params.search = search;
      const [eqRes, catRes] = await Promise.all([
        api.get<{ items: Equipment[] }>("/equipment", params),
        api.get<EquipmentCategory[]>("/equipment/categories"),
      ]);
      setEquipment(eqRes.items ?? []);
      setCategories(catRes ?? []);
    } catch {
      setEquipment([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterCategoryId, search]);

  useEffect(() => {
    dispatch(fetchProjects({ limit: 100 }));
    loadEquipment();
  }, [loadEquipment, dispatch]);

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post("/equipment", {
        name: newName,
        description: newDescription || undefined,
        serialNumber: newSerial || undefined,
        categoryId: newCategoryId || undefined,
        status: newStatus,
        dailyRate: newDailyRate ? parseFloat(newDailyRate) : undefined,
        purchaseCost: newPurchaseCost ? parseFloat(newPurchaseCost) : undefined,
        purchasedAt: newPurchasedAt || undefined,
      });
      toast.success(`${newName} added`);
      setShowAddForm(false);
      setNewName(""); setNewDescription(""); setNewSerial("");
      setNewCategoryId(""); setNewStatus("AVAILABLE");
      setNewDailyRate(""); setNewPurchaseCost(""); setNewPurchasedAt("");
      loadEquipment();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add equipment");
    } finally {
      setSaving(false);
    }
  }

  async function handleAllocate() {
    if (!selectedEq) return;
    setAllocating(true);
    try {
      await api.post(`/equipment/${selectedEq.id}/allocate`, {
        projectId: allocProjectId,
        startDate: allocStart,
        endDate: allocEnd || undefined,
        notes: allocNotes || undefined,
      });
      toast.success("Equipment allocated");
      setShowAllocate(false);
      setAllocProjectId(""); setAllocEnd(""); setAllocNotes("");
      setAllocStart(new Date().toISOString().split("T")[0]);
      loadEquipment();
      setSelectedEq(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to allocate");
    } finally {
      setAllocating(false);
    }
  }

  async function handleReturn(eq: Equipment, allocation: Allocation) {
    try {
      await api.post(`/equipment/${eq.id}/return/${allocation.id}`, {});
      toast.success("Equipment returned");
      loadEquipment();
      setSelectedEq(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to return");
    }
  }

  async function handleStatusChange(eq: Equipment, status: EquipmentStatus) {
    try {
      await api.patch(`/equipment/${eq.id}`, { status });
      toast.success(`Status updated to ${status}`);
      loadEquipment();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleAddCategory() {
    setSavingCategory(true);
    try {
      await api.post("/equipment/categories", { name: newCategoryName });
      toast.success("Category added");
      setShowAddCategory(false);
      setNewCategoryName("");
      loadEquipment();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingCategory(false);
    }
  }

  async function loadDetail(eq: Equipment) {
    try {
      const full = await api.get<Equipment>(`/equipment/${eq.id}`);
      setSelectedEq(full);
    } catch {
      setSelectedEq(eq);
    }
  }

  const statusCounts = Object.keys(STATUS_CONFIG).reduce<Record<string, number>>((acc, s) => {
    acc[s] = equipment.filter((e) => e.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        description="Track equipment, allocate to projects, and monitor availability."
      >
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Equipment
        </Button>
      </PageHeader>

      {/* Status summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(STATUS_CONFIG) as [EquipmentStatus, typeof STATUS_CONFIG[EquipmentStatus]][]).map(([status, cfg]) => (
          <Card
            key={status}
            className={`cursor-pointer transition-colors ${filterStatus === status ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
          >
            <CardContent className="flex items-center gap-3 py-3">
              <cfg.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{statusCounts[status] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipment">Equipment ({equipment.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        {/* ── Equipment list ── */}
        <TabsContent value="equipment" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Input
              className="w-48"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={filterCategoryId || "ALL"} onValueChange={(v: string | null) => setFilterCategoryId(v === "ALL" || !v ? "" : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All categories">
                  {categories.find((c) => c.id === filterCategoryId)?.name ?? "All categories"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterStatus || filterCategoryId || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(""); setFilterCategoryId(""); setSearch(""); }}>
                <X className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : equipment.length === 0 ? (
            <EmptyState icon={Wrench} title="No equipment" description="Add your first piece of equipment to start tracking." actionLabel="Add Equipment" onAction={() => setShowAddForm(true)} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {equipment.map((eq) => {
                const cfg = STATUS_CONFIG[eq.status];
                return (
                  <Card key={eq.id} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => loadDetail(eq)}>
                    <CardContent className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold leading-tight">{eq.name}</p>
                          {eq.category && <p className="text-[11px] text-muted-foreground">{eq.category.name}</p>}
                        </div>
                        <Badge variant={cfg.variant as any} className="text-[10px] shrink-0">{cfg.label}</Badge>
                      </div>
                      {eq.serialNumber && <p className="text-[11px] text-muted-foreground">S/N: {eq.serialNumber}</p>}
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        {eq.dailyRate != null && <span>${Number(eq.dailyRate).toFixed(2)}/day</span>}
                        {(eq._count?.allocations ?? 0) > 0 && <span>{eq._count!.allocations} allocation(s)</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Categories ── */}
        <TabsContent value="categories" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddCategory(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Category
            </Button>
          </div>
          {categories.length === 0 ? (
            <EmptyState icon={Wrench} title="No categories" description="Create categories to organise your equipment." actionLabel="Add Category" onAction={() => setShowAddCategory(true)} />
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <Card key={cat.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <Badge variant="secondary" className="text-[11px]">{cat._count?.equipment ?? 0} item(s)</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Equipment Detail / Actions Dialog ── */}
      <Dialog open={Boolean(selectedEq)} onOpenChange={(open) => { if (!open) setSelectedEq(null); }}>
        {selectedEq && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedEq.name}</DialogTitle>
              <DialogDescription>
                {selectedEq.category?.name}
                {selectedEq.serialNumber ? ` · S/N ${selectedEq.serialNumber}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status + actions */}
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(STATUS_CONFIG) as EquipmentStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selectedEq.status === s ? "default" : "outline"}
                    onClick={() => handleStatusChange(selectedEq, s)}
                    disabled={selectedEq.status === s}
                  >
                    {STATUS_CONFIG[s].label}
                  </Button>
                ))}
              </div>

              {/* Costs */}
              {(selectedEq.dailyRate != null || selectedEq.purchaseCost != null) && (
                <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
                  {selectedEq.dailyRate != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Daily Rate</p>
                      <p className="font-semibold">${Number(selectedEq.dailyRate).toFixed(2)}</p>
                    </div>
                  )}
                  {selectedEq.purchaseCost != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Purchase Cost</p>
                      <p className="font-semibold">${Number(selectedEq.purchaseCost).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Allocation history */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Allocations</p>
                  {selectedEq.status === "AVAILABLE" && (
                    <Button size="sm" onClick={() => { setShowAllocate(true); }}>
                      <HardHat className="mr-1.5 h-3.5 w-3.5" /> Allocate
                    </Button>
                  )}
                </div>
                {(!selectedEq.allocations || selectedEq.allocations.length === 0) ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No allocations yet</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {selectedEq.allocations.map((alloc) => (
                      <div key={alloc.id} className="rounded-md border p-2 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alloc.project.name}</p>
                          {!alloc.returnedAt ? (
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleReturn(selectedEq, alloc)}>
                              <RotateCcw className="mr-1 h-3 w-3" /> Return
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Returned</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {new Date(alloc.startDate).toLocaleDateString()}
                          {alloc.endDate ? ` → ${new Date(alloc.endDate).toLocaleDateString()}` : " → ongoing"}
                        </p>
                        <p className="text-muted-foreground">
                          By {alloc.allocatedBy.firstName} {alloc.allocatedBy.lastName}
                        </p>
                        {alloc.notes && <p className="italic text-muted-foreground">{alloc.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Allocate Dialog ── */}
      <Dialog open={showAllocate} onOpenChange={(open) => { if (!open) { setShowAllocate(false); setAllocProjectId(""); setAllocEnd(""); setAllocNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Equipment</DialogTitle>
            <DialogDescription>Assign {selectedEq?.name} to a project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={allocProjectId || "NONE"} onValueChange={(v: string | null) => setAllocProjectId(v === "NONE" || !v ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select project">{projects.find((p) => p.id === allocProjectId)?.name ?? "Select project"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Select project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={allocStart} onChange={(e) => setAllocStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={allocEnd} onChange={(e) => setAllocEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={allocNotes} onChange={(e) => setAllocNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllocate(false)} disabled={allocating}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={allocating || !allocProjectId || !allocStart}>
              {allocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {allocating ? "Allocating..." : "Allocate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Equipment Dialog ── */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>Register a new piece of equipment in the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Concrete Mixer 350L" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategoryId || "NONE"} onValueChange={(v: string | null) => setNewCategoryId(v === "NONE" || !v ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No category">{categories.find((c) => c.id === newCategoryId)?.name ?? "No category"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select value={newStatus} onValueChange={(v: string | null) => v && setNewStatus(v as EquipmentStatus)}>
                <SelectTrigger><SelectValue>{STATUS_CONFIG[newStatus].label}</SelectValue></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_CONFIG) as [EquipmentStatus, typeof STATUS_CONFIG[EquipmentStatus]][]).map(([s, cfg]) => (
                    <SelectItem key={s} value={s}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Daily Rate ($)</Label>
              <Input type="number" step="0.01" min={0} value={newDailyRate} onChange={(e) => setNewDailyRate(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Purchase Cost ($)</Label>
              <Input type="number" step="0.01" min={0} value={newPurchaseCost} onChange={(e) => setNewPurchaseCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" value={newPurchasedAt} onChange={(e) => setNewPurchasedAt(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Spec notes, brand, condition, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !newName}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Add Equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Category Dialog ── */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Category Name *</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Heavy Machinery"
              onKeyDown={(e) => { if (e.key === "Enter" && newCategoryName) handleAddCategory(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)} disabled={savingCategory}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={savingCategory || !newCategoryName}>
              {savingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
