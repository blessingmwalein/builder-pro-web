"use client";

import { useEffect, useState } from "react";
import { Package, Plus, AlertTriangle, ShoppingCart, UserPlus, Loader2, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import {
  fetchMaterials,
  fetchLowStock,
  fetchSuppliers,
  createMaterial,
  logMaterialUsage,
  fetchMaterialCategories,
} from "@/store/slices/materialsSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SupplierFormModal } from "@/components/materials/supplier-form-modal";
import { BulkPurchaseModal } from "@/components/materials/bulk-purchase-modal";
import { MaterialViewDrawer } from "@/components/materials/material-view-drawer";
import type { Material } from "@/types";

export default function MaterialsPage() {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items, total, lowStock, suppliers, categories, isLoading } = useAppSelector((s) => s.materials);
  const { items: projects } = useAppSelector((s) => s.projects);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showBulkPurchase, setShowBulkPurchase] = useState(false);

  // Add material form state
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newReorderAt, setNewReorderAt] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStock, setNewStock] = useState("0");
  const [creatingMaterial, setCreatingMaterial] = useState(false);

  // Filters + view drawer
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [viewMaterialId, setViewMaterialId] = useState<string | null>(null);

  // Log usage form state
  const [logProjectId, setLogProjectId] = useState("");
  const [logMaterialId, setLogMaterialId] = useState("");
  const [logQty, setLogQty] = useState("");
  const [logCost, setLogCost] = useState("");
  const [logNotes, setLogNotes] = useState("");

  useEffect(() => {
    dispatch(
      fetchMaterials({
        page,
        limit: 20,
        search: search || undefined,
        categoryId: filterCategoryId || undefined,
        supplierId: filterSupplierId || undefined,
        lowStock: filterLowStock || undefined,
      }),
    );
    dispatch(fetchLowStock());
    dispatch(fetchSuppliers({}));
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchMaterialCategories());
  }, [dispatch, page, search, filterCategoryId, filterSupplierId, filterLowStock]);

  async function handleAddMaterial() {
    setCreatingMaterial(true);
    try {
      await dispatch(
        createMaterial({
          name: newName,
          unit: newUnit,
          unitCost: parseFloat(newCost),
          sku: newSku || undefined,
          categoryId: newCategoryId || undefined,
          supplierId: newSupplierId || undefined,
          reorderAt: newReorderAt ? parseFloat(newReorderAt) : undefined,
          description: newDescription.trim() || undefined,
          stockOnHand: newStock ? parseFloat(newStock) : undefined,
        }),
      ).unwrap();
      toast.success(`${newName} added to catalog`);
      setShowAdd(false);
      setNewName("");
      setNewUnit("");
      setNewCost("");
      setNewSku("");
      setNewCategoryId("");
      setNewSupplierId("");
      setNewReorderAt("");
      setNewDescription("");
      setNewStock("0");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add material");
    } finally {
      setCreatingMaterial(false);
    }
  }

  const selectedCategoryName =
    categories.find((c) => c.id === newCategoryId)?.name ?? null;
  const selectedSupplierName =
    suppliers.find((s) => s.id === newSupplierId)?.name ?? null;
  const selectedFilterCategoryName =
    categories.find((c) => c.id === filterCategoryId)?.name ?? null;
  const selectedFilterSupplierName =
    suppliers.find((s) => s.id === filterSupplierId)?.name ?? null;
  const selectedViewMaterial = items.find((m) => m.id === viewMaterialId) ?? null;
  const activeFilterCount = (filterCategoryId ? 1 : 0) + (filterSupplierId ? 1 : 0) + (filterLowStock ? 1 : 0);

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
    {
      key: "category",
      header: "Category",
      cell: (m) => (
        <span className="text-sm text-muted-foreground">{(m as any).categoryRef?.name || (m as any).category || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Materials & Inventory" description="Track materials, stock levels, and usage.">
        <Button variant="outline" onClick={() => setShowLog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log Usage
        </Button>
        <Button variant="outline" onClick={() => setShowBulkPurchase(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" /> Record Purchase
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
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Filters</p>
              {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount} active</Badge> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Search materials..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                value={filterCategoryId || "ALL"}
                onValueChange={(v: string | null) => {
                  const value = v === "ALL" || !v ? "" : v;
                  setFilterCategoryId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories">
                    {selectedFilterCategoryName || "All categories"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterSupplierId || "ALL"}
                onValueChange={(v: string | null) => {
                  const value = v === "ALL" || !v ? "" : v;
                  setFilterSupplierId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers">
                    {selectedFilterSupplierName || "All suppliers"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={filterLowStock ? "default" : "outline"}
                  className="w-full"
                  onClick={() => {
                    setFilterLowStock((current) => !current);
                    setPage(1);
                  }}
                >
                  Low stock only
                </Button>
                {activeFilterCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setSearch("");
                      setFilterCategoryId("");
                      setFilterSupplierId("");
                      setFilterLowStock(false);
                      setPage(1);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {items.length === 0 && !isLoading ? (
            <EmptyState icon={Package} title="No materials" description="Add your first material to start tracking inventory." actionLabel="Add Material" onAction={() => setShowAdd(true)} />
          ) : (
            <DataTable
              columns={columns}
              data={items}
              isLoading={isLoading}
              page={page}
              totalPages={Math.ceil(total / 20)}
              onPageChange={setPage}
              onRowClick={(material) => setViewMaterialId(material.id)}
            />
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} on file
            </p>
            <Button size="sm" onClick={() => setShowSupplierModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Supplier
            </Button>
          </div>
          <div className="space-y-2">
            {suppliers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No suppliers yet &mdash; Electrosales, Halsteds and Bhola will be
                seeded the next time this page loads.
              </p>
            ) : (
              suppliers.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.email}{s.phone ? ` / ${s.phone}` : ""}
                      </p>
                      {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(s as any).categories && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {String((s as any).categories)
                            .split(",")
                            .filter(Boolean)
                            .map((code) => {
                              const cat = categories.find((c) => c.code === code.trim());
                              return (
                                <Badge key={code} variant="secondary" className="text-[10px]">
                                  {cat?.name ?? code}
                                </Badge>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Material Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Material</DialogTitle>
            <DialogDescription>
              Register a new material in your catalog. Category + supplier make
              reporting and bulk purchases much easier down the line.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cement (50kg bag)" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategoryId || "NONE"} onValueChange={(v: string | null) => setNewCategoryId(v === "NONE" || !v ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category">
                    {selectedCategoryName || "No category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={newSupplierId || "NONE"} onValueChange={(v: string | null) => setNewSupplierId(v === "NONE" || !v ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier">
                    {selectedSupplierName || "No supplier"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure *</Label>
              <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="bags, m, kg, litres" />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost *</Label>
              <Input type="number" step="0.01" min={0} value={newCost} onChange={(e) => setNewCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={newReorderAt}
                onChange={(e) => setNewReorderAt(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-2">
              <Label>Opening Stock</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Spec notes, brand, grade, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={creatingMaterial}>Cancel</Button>
            <Button onClick={handleAddMaterial} disabled={!newName || !newUnit || !newCost || creatingMaterial}>
              {creatingMaterial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {creatingMaterial ? "Adding..." : "Add Material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupplierFormModal
        open={showSupplierModal}
        onOpenChange={setShowSupplierModal}
        onSaved={() => dispatch(fetchSuppliers({}))}
      />

      <BulkPurchaseModal
        open={showBulkPurchase}
        onOpenChange={setShowBulkPurchase}
        onSaved={() => {
          dispatch(fetchMaterials({ page, limit: 20, search: search || undefined }));
          dispatch(fetchLowStock());
        }}
      />

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

      <MaterialViewDrawer
        open={Boolean(viewMaterialId)}
        onOpenChange={(open) => {
          if (!open) setViewMaterialId(null);
        }}
        material={selectedViewMaterial}
      />
    </div>
  );
}
