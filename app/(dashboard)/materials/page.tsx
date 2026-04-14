"use client";

import { useEffect, useState } from "react";
import { Package, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchMaterials, fetchLowStock, fetchSuppliers, createMaterial, logMaterialUsage } from "@/store/slices/materialsSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Material } from "@/types";

export default function MaterialsPage() {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items, total, lowStock, suppliers, isLoading } = useAppSelector((s) => s.materials);
  const { items: projects } = useAppSelector((s) => s.projects);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // Add material form state
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newSku, setNewSku] = useState("");

  // Log usage form state
  const [logProjectId, setLogProjectId] = useState("");
  const [logMaterialId, setLogMaterialId] = useState("");
  const [logQty, setLogQty] = useState("");
  const [logCost, setLogCost] = useState("");
  const [logNotes, setLogNotes] = useState("");

  useEffect(() => {
    dispatch(fetchMaterials({ page, limit: 20, search: search || undefined }));
    dispatch(fetchLowStock());
    dispatch(fetchSuppliers({}));
    dispatch(fetchProjects({ limit: 100 }));
  }, [dispatch, page, search]);

  function handleAddMaterial() {
    dispatch(createMaterial({ name: newName, unit: newUnit, unitCost: parseFloat(newCost), sku: newSku || undefined }));
    setShowAdd(false);
    setNewName(""); setNewUnit(""); setNewCost(""); setNewSku("");
  }

  function handleLogUsage() {
    dispatch(logMaterialUsage({ projectId: logProjectId, materialId: logMaterialId, quantity: parseFloat(logQty), unitCost: parseFloat(logCost), notes: logNotes || undefined }));
    setShowLog(false);
    setLogProjectId(""); setLogMaterialId(""); setLogQty(""); setLogCost(""); setLogNotes("");
  }

  const columns: Column<Material>[] = [
    {
      key: "name",
      header: "Material",
      cell: (m) => (
        <div>
          <p className="text-sm font-semibold">{m.name}</p>
          {m.sku && <p className="text-xs text-muted-foreground">SKU: {m.sku}</p>}
        </div>
      ),
    },
    { key: "unit", header: "Unit", cell: (m) => <span className="text-sm">{m.unit}</span> },
    {
      key: "cost",
      header: "Unit Cost",
      cell: (m) => <span className="text-sm font-medium">{formatCurrency(m.unitCost)}</span>,
      className: "text-right",
    },
    {
      key: "stock",
      header: "Stock",
      cell: (m) => {
        const isLow = m.currentStock <= m.reorderAt;
        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isLow ? "text-destructive" : ""}`}>{m.currentStock}</span>
            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          </div>
        );
      },
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (m) => <span className="text-sm text-muted-foreground">{m.supplier?.name || "—"}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Materials & Inventory" description="Track materials, stock levels, and usage.">
        <Button variant="outline" onClick={() => setShowLog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log Usage
        </Button>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Material
        </Button>
      </PageHeader>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {lowStock.length} material{lowStock.length > 1 ? "s" : ""} below reorder level
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStock.map((m) => (
                <Badge key={m.id} variant="secondary" className="text-xs">
                  {m.name} ({m.currentStock} {m.unit})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4 space-y-4">
          <Input
            placeholder="Search materials..."
            className="max-w-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {items.length === 0 && !isLoading ? (
            <EmptyState icon={Package} title="No materials" description="Add your first material to start tracking inventory." actionLabel="Add Material" onAction={() => setShowAdd(true)} />
          ) : (
            <DataTable columns={columns} data={items} isLoading={isLoading} page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <div className="space-y-2">
            {suppliers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No suppliers added yet.</p>
            ) : (
              suppliers.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email} {s.phone ? `/ ${s.phone}` : ""}</p>
                    </div>
                    {s.address && <span className="text-xs text-muted-foreground">{s.address}</span>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Material Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cement (50kg bag)" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Unit *</Label><Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="bags, m, kg" /></div>
              <div className="space-y-2"><Label>Unit Cost *</Label><Input type="number" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>SKU</Label><Input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="Optional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial} disabled={!newName || !newUnit || !newCost}>Add Material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Usage Dialog */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Material Usage</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={logProjectId} onValueChange={(v: string | null) => setLogProjectId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material *</Label>
              <Select value={logMaterialId} onValueChange={(v: string | null) => { setLogMaterialId(v ?? ""); const m = items.find((i) => i.id === v); if (m) setLogCost(String(m.unitCost)); }}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>{items.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" step="0.01" value={logQty} onChange={(e) => setLogQty(e.target.value)} /></div>
              <div className="space-y-2"><Label>Unit Cost</Label><Input type="number" step="0.01" value={logCost} onChange={(e) => setLogCost(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={logNotes} onChange={(e) => setLogNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
            <Button onClick={handleLogUsage} disabled={!logProjectId || !logMaterialId || !logQty}>Log Usage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
