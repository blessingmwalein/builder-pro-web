"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Package, Plus, AlertTriangle, ShoppingCart, UserPlus, Loader2,
  Filter, X, FileText, Truck, ClipboardList, Tag, Trash2, Pencil, Search, ChevronDown, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector, useFormatCurrency, useHasAnyPermission } from "@/lib/hooks";
import { useRequirePermission } from "@/lib/use-require-permission";
import { FEATURE_PERMS } from "@/lib/permissions";
import {
  fetchMaterials, fetchLowStock, fetchSuppliers, createMaterial,
  updateMaterial, deleteMaterial,
  logMaterialUsage, fetchMaterialCategories, createMaterialCategory,
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { SupplierFormModal } from "@/components/materials/supplier-form-modal";
import { BulkPurchaseModal } from "@/components/materials/bulk-purchase-modal";
import { MaterialViewDrawer } from "@/components/materials/material-view-drawer";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Material } from "@/types";
import api from "@/lib/api";
import { searchElectrosalesProducts, preloadElectrosalesProducts, type ElectrosalesProduct } from "@/lib/electrosales";

// ─── Electrosales ProductSearchPopover ───────────────────────────────────────

function ElectrosalesPopover({
  chosen,
  onSelect,
  formatCurrency,
}: {
  chosen?: ElectrosalesProduct | null;
  onSelect: (p: ElectrosalesProduct) => void;
  formatCurrency: (n: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ElectrosalesProduct[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      setResults(await searchElectrosalesProducts(q, 10));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className={cn("flex-1 truncate text-left text-sm", chosen ? "" : "text-muted-foreground")}>
          {chosen?.name ?? "Search Electrosales catalog…"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Product name, SKU or keyword…"
            value={query}
            onValueChange={(q) => void handleSearch(q)}
          />
          <CommandList className="max-h-80">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No products found.</CommandEmpty>
            )}
            {!loading && query.length < 2 && (
              <div className="px-3 py-3 text-xs text-muted-foreground">
                Type at least 2 characters to search 11,000+ products
              </div>
            )}
            <CommandGroup>
              {results.map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => { onSelect(product); setOpen(false); setQuery(""); setResults([]); }}
                  className="flex items-start gap-3 py-2.5"
                >
                  {/* Thumbnail */}
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{product.name}</span>
                      <span className="shrink-0 text-xs font-bold text-primary">
                        {formatCurrency(product.priceExclVat || product.price)} excl.
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.uom && <span>{product.uom}</span>}
                      <span className={cn(
                        "font-medium",
                        (product.availability || "").toLowerCase().includes("in") ? "text-green-600" : "text-amber-500",
                      )}>
                        {product.availability}
                      </span>
                      <span>{product.supplierName}</span>
                    </div>
                    {product.breadcrumbs.length > 0 && (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                        {product.breadcrumbs.join(" › ")}
                      </span>
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

export default function MaterialsPage() {
  useRequirePermission(FEATURE_PERMS.materials);
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const formatCurrency = useFormatCurrency();
  const { items, total, lowStock, suppliers, categories, isLoading } = useAppSelector((s) => s.materials);
  const { items: projects } = useAppSelector((s) => s.projects);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const canManageInventory = useHasAnyPermission(["materials.*", "materials.manage_inventory"]);
  const canLogUsage = useHasAnyPermission(["materials.*", "materials.log"]);
  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showBulkPurchase, setShowBulkPurchase] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "inventory");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // ─── Procurement types ────────────────────────────────────────────────────────

  type PrStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "ORDERED";
  type PoStatus = "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";

  interface PrItem {
    id: string; description: string; quantity: number; unit: string;
    estimatedUnitCost?: number; materialId?: string;
    material?: { id: string; name: string; unit: string };
  }

  interface PurchaseRequest {
    id: string; prNumber: string; status: PrStatus; notes?: string; createdAt: string;
    requestedBy: { id: string; firstName: string; lastName: string };
    approvedBy?: { id: string; firstName: string; lastName: string };
    project?: { id: string; name: string };
    items: PrItem[]; _count?: { items: number; orders: number };
  }

  interface PoItem {
    id: string; description: string; quantity: number; unitCost: number; totalCost: number;
    materialId?: string; material?: { id: string; name: string; unit: string };
  }

  interface PurchaseOrder {
    id: string; poNumber: string; status: PoStatus; totalAmount: number;
    expectedDelivery?: string; deliveredAt?: string; notes?: string; createdAt: string;
    supplier: { id: string; name: string };
    purchaseRequest?: { id: string; prNumber: string };
    items: PoItem[]; deliveryNotes?: { id: string; deliveryDate: string }[];
    _count?: { items: number; deliveryNotes: number };
  }

  interface DeliveryNote {
    id: string; deliveryDate: string; notes?: string; createdAt: string;
    purchaseOrder: { id: string; poNumber: string; supplier?: { name: string } };
    receivedBy: { id: string; firstName: string; lastName: string };
    _count?: { items: number };
  }

  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [procurementLoading, setProcurementLoading] = useState(false);
  const [procSubTab, setProcSubTab] = useState("prs");

  // ─── PR form ──────────────────────────────────────────────────────────────────
  const [showPrForm, setShowPrForm] = useState(false);
  const [prNotes, setPrNotes] = useState("");
  const [prProjectId, setPrProjectId] = useState("");
  const [prItems, setPrItems] = useState([{ description: "", quantity: "", unit: "", estimatedUnitCost: "", materialId: "" }]);
  const [savingPr, setSavingPr] = useState(false);

  // ─── PO form ──────────────────────────────────────────────────────────────────
  const [showPoForm, setShowPoForm] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poPrId, setPoPrId] = useState("");
  const [poExpected, setPoExpected] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poItems, setPoItems] = useState([{ description: "", quantity: "", unitCost: "", materialId: "" }]);
  const [savingPo, setSavingPo] = useState(false);

  // ─── Delivery form ────────────────────────────────────────────────────────────
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryPoId, setDeliveryPoId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryItems, setDeliveryItems] = useState([{ description: "", quantityOrdered: "", quantityReceived: "", materialId: "" }]);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const loadProcurement = useCallback(async () => {
    setProcurementLoading(true);
    try {
      const [prRes, poRes, dnRes] = await Promise.all([
        api.get<{ items: PurchaseRequest[] }>("/procurement/purchase-requests", { limit: 50 }),
        api.get<{ items: PurchaseOrder[] }>("/procurement/purchase-orders", { limit: 50 }),
        api.get<{ items: DeliveryNote[] }>("/procurement/deliveries", { limit: 50 }),
      ]);
      setPrs(prRes.items ?? []);
      setPos(poRes.items ?? []);
      setDeliveries(dnRes.items ?? []);
    } catch {
      // silently fail if procurement tables not yet available
    } finally {
      setProcurementLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "procurement") loadProcurement();
  }, [activeTab, loadProcurement]);

  async function handleCreatePR() {
    setSavingPr(true);
    try {
      await api.post("/procurement/purchase-requests", {
        projectId: prProjectId || undefined,
        notes: prNotes || undefined,
        items: prItems.map((i) => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          estimatedUnitCost: i.estimatedUnitCost ? parseFloat(i.estimatedUnitCost) : undefined,
          materialId: i.materialId || undefined,
        })),
      });
      toast.success("Purchase request created");
      setShowPrForm(false);
      setPrNotes(""); setPrProjectId("");
      setPrItems([{ description: "", quantity: "", unit: "", estimatedUnitCost: "", materialId: "" }]);
      loadProcurement();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create PR");
    } finally {
      setSavingPr(false);
    }
  }

  async function handleCreatePO() {
    setSavingPo(true);
    try {
      await api.post("/procurement/purchase-orders", {
        supplierId: poSupplierId,
        purchaseRequestId: poPrId || undefined,
        expectedDelivery: poExpected || undefined,
        notes: poNotes || undefined,
        items: poItems.map((i) => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unitCost: parseFloat(i.unitCost),
          materialId: i.materialId || undefined,
        })),
      });
      toast.success("Purchase order created");
      setShowPoForm(false);
      setPoSupplierId(""); setPoPrId(""); setPoExpected(""); setPoNotes("");
      setPoItems([{ description: "", quantity: "", unitCost: "", materialId: "" }]);
      loadProcurement();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create PO");
    } finally {
      setSavingPo(false);
    }
  }

  async function handleRecordDelivery() {
    setSavingDelivery(true);
    try {
      await api.post(`/procurement/purchase-orders/${deliveryPoId}/deliver`, {
        deliveryDate,
        notes: deliveryNotes || undefined,
        items: deliveryItems.map((i) => ({
          description: i.description,
          quantityOrdered: parseFloat(i.quantityOrdered),
          quantityReceived: parseFloat(i.quantityReceived),
          materialId: i.materialId || undefined,
        })),
      });
      toast.success("Delivery recorded — stock updated");
      setShowDeliveryForm(false);
      setDeliveryPoId(""); setDeliveryNotes("");
      setDeliveryDate(new Date().toISOString().split("T")[0]);
      setDeliveryItems([{ description: "", quantityOrdered: "", quantityReceived: "", materialId: "" }]);
      loadProcurement();
      dispatch(fetchMaterials({ page, limit: 20 }));
      dispatch(fetchLowStock());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record delivery");
    } finally {
      setSavingDelivery(false);
    }
  }

  async function handlePrAction(id: string, action: "submit" | "approve" | "reject") {
    try {
      await api.post(`/procurement/purchase-requests/${id}/${action}`, {});
      toast.success(`PR ${action}d`);
      loadProcurement();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} PR`);
    }
  }

  async function handleSendPO(id: string) {
    try {
      await api.post(`/procurement/purchase-orders/${id}/send`, {});
      toast.success("PO marked as sent");
      loadProcurement();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send PO");
    }
  }

  const PR_STATUS_COLORS: Record<PrStatus, string> = {
    DRAFT: "secondary", SUBMITTED: "default", APPROVED: "outline",
    REJECTED: "destructive", ORDERED: "default",
  } as const;

  const PO_STATUS_COLORS: Record<PoStatus, string> = {
    DRAFT: "secondary", SENT: "default", PARTIAL: "outline",
    RECEIVED: "outline", CANCELLED: "destructive",
  } as const;

  // ─── Add / Edit Material state ────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newReorderAt, setNewReorderAt] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStock, setNewStock] = useState("0");
  const [editReason, setEditReason] = useState("");
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [esProduct, setEsProduct] = useState<ElectrosalesProduct | null>(null);

  // ─── Delete confirmation state ────────────────────────────────────────────────
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // ─── Category management state ────────────────────────────────────────────────
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // ─── Filters ──────────────────────────────────────────────────────────────────
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [viewMaterialId, setViewMaterialId] = useState<string | null>(null);

  // ─── Bulk log usage state ─────────────────────────────────────────────────────
  const [logProjectId, setLogProjectId] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  type LogLine = { materialId: string; qty: string; unitCost: string; notes: string };
  const emptyLogLine = (): LogLine => ({ materialId: "", qty: "", unitCost: "", notes: "" });
  const [logLines, setLogLines] = useState<LogLine[]>([emptyLogLine()]);
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    dispatch(fetchMaterials({
      page, limit: 20,
      search: search || undefined,
      categoryId: filterCategoryId || undefined,
      supplierId: filterSupplierId || undefined,
      lowStock: filterLowStock || undefined,
    }));
    dispatch(fetchLowStock());
    dispatch(fetchSuppliers({}));
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchMaterialCategories());
  }, [dispatch, page, search, filterCategoryId, filterSupplierId, filterLowStock]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editMaterial) {
      setNewName(editMaterial.name);
      setNewUnit(editMaterial.unit);
      setNewCost(String(editMaterial.unitCost));
      setNewSku(editMaterial.sku ?? "");
      setNewCategoryId((editMaterial as any).categoryRef?.id ?? "");
      setNewSupplierId(editMaterial.supplierId ?? "");
      setNewReorderAt(editMaterial.reorderAt ? String(editMaterial.reorderAt) : "");
      setNewDescription((editMaterial as any).description ?? "");
      setNewStock(String(editMaterial.currentStock));
      setEditReason("");
    }
  }, [editMaterial]);

  function openEditMaterial(m: Material) {
    setEditMaterial(m);
    setShowAdd(true);
  }

  function closeAddEditDialog() {
    setShowAdd(false);
    setEditMaterial(null);
    setNewName(""); setNewUnit(""); setNewCost(""); setNewSku("");
    setNewCategoryId(""); setNewSupplierId(""); setNewReorderAt("");
    setNewDescription(""); setNewStock("0"); setEditReason("");
    setEsProduct(null);
  }

  function openAddMaterial() {
    setShowAdd(true);
    // Pre-warm browser cache so search is instant
    void preloadElectrosalesProducts();
  }

  async function handleAddMaterial() {
    setCreatingMaterial(true);
    try {
      await dispatch(createMaterial({
        name: newName, unit: newUnit, unitCost: parseFloat(newCost),
        sku: newSku || undefined, categoryId: newCategoryId || undefined,
        supplierId: newSupplierId || undefined,
        reorderAt: newReorderAt ? parseFloat(newReorderAt) : undefined,
        description: newDescription.trim() || undefined,
        stockOnHand: newStock ? parseFloat(newStock) : undefined,
      })).unwrap();
      toast.success(`${newName} added to catalog`);
      closeAddEditDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add material");
    } finally {
      setCreatingMaterial(false);
    }
  }

  async function handleUpdateMaterial() {
    if (!editMaterial) return;
    setCreatingMaterial(true);
    try {
      await dispatch(updateMaterial({
        id: editMaterial.id,
        data: {
          name: newName, unit: newUnit, unitCost: parseFloat(newCost),
          sku: newSku || undefined, categoryId: newCategoryId || undefined,
          supplierId: newSupplierId || undefined,
          reorderAt: newReorderAt ? parseFloat(newReorderAt) : undefined,
          description: newDescription.trim() || undefined,
          stockOnHand: newStock ? parseFloat(newStock) : undefined,
          reason: editReason.trim() || undefined,
        },
      })).unwrap();
      toast.success(`${newName} updated`);
      closeAddEditDialog();
      dispatch(fetchLowStock());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update material");
    } finally {
      setCreatingMaterial(false);
    }
  }

  async function handleDeleteMaterial(m: Material) {
    try {
      await dispatch(deleteMaterial(m.id)).unwrap();
      toast.success(`${m.name} deleted`);
      setMaterialToDelete(null);
      if (viewMaterialId === m.id) setViewMaterialId(null);
      dispatch(fetchLowStock());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete material");
    }
  }

  async function handleCreateCategory() {
    if (!newCatName.trim() || !newCatCode.trim()) return;
    setCreatingCat(true);
    try {
      await dispatch(createMaterialCategory({
        name: newCatName.trim(),
        code: newCatCode.trim().toUpperCase(),
      })).unwrap();
      toast.success(`Category "${newCatName}" created`);
      setNewCatName("");
      setNewCatCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCat(false);
    }
  }

  async function handleLogUsage() {
    const valid = logLines.filter((l) => l.materialId && Number(l.qty) > 0);
    if (!logProjectId) { toast.error("Select a project"); return; }
    if (valid.length === 0) { toast.error("Add at least one line item"); return; }
    setSavingLog(true);
    try {
      await Promise.all(
        valid.map((l) =>
          dispatch(logMaterialUsage({
            projectId: logProjectId,
            materialId: l.materialId,
            quantity: Number(l.qty),
            unitCost: Number(l.unitCost) || 0,
            notes: l.notes.trim() || undefined,
            usedAt: logDate,
          })).unwrap(),
        ),
      );
      toast.success(`${valid.length} usage log${valid.length > 1 ? "s" : ""} recorded`);
      setShowLog(false);
      setLogProjectId(""); setLogDate(new Date().toISOString().split("T")[0]);
      setLogLines([emptyLogLine()]);
      dispatch(fetchMaterials({ page, limit: 20 }));
      dispatch(fetchLowStock());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log usage");
    } finally {
      setSavingLog(false);
    }
  }

  function updateLogLine(i: number, patch: Partial<LogLine>) {
    setLogLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  // ─── Derived option lists ─────────────────────────────────────────────────────
  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name, sublabel: s.email || undefined })),
    [suppliers],
  );
  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name, sublabel: c.code })),
    [categories],
  );
  const materialOptions = useMemo(
    () => items.map((m) => ({
      value: m.id, label: m.name,
      sublabel: `${m.unit} · Stock: ${m.currentStock ?? 0}`,
    })),
    [items],
  );
  const approvedPrOptions = useMemo(
    () => prs.filter((p) => p.status === "APPROVED").map((p) => ({
      value: p.id, label: p.prNumber,
      sublabel: p.project?.name,
    })),
    [prs],
  );
  const activePOOptions = useMemo(
    () => pos.filter((p) => p.status === "SENT" || p.status === "PARTIAL").map((p) => ({
      value: p.id, label: p.poNumber,
      sublabel: p.supplier?.name,
    })),
    [pos],
  );

  const activeFilterCount = (filterCategoryId ? 1 : 0) + (filterSupplierId ? 1 : 0) + (filterLowStock ? 1 : 0);
  const selectedViewMaterial = items.find((m) => m.id === viewMaterialId) ?? null;

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
        <span className="text-sm text-muted-foreground">
          {(m as any).categoryRef?.name || (m as any).category || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (m) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canManageInventory && (
            <>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => openEditMaterial(m)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setMaterialToDelete(m)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Materials & Inventory" description="Track materials, stock levels, and usage.">
        {canLogUsage && (
          <Button variant="outline" onClick={() => setShowLog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Log Usage
          </Button>
        )}
        {canManageInventory && (
          <>
            <Button variant="outline" onClick={() => setShowBulkPurchase(true)}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Record Purchase
            </Button>
            <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
              <Tag className="mr-2 h-4 w-4" /> Categories
            </Button>
            <Button onClick={openAddMaterial}>
              <Plus className="mr-2 h-4 w-4" /> Add Material
            </Button>
          </>
        )}
      </PageHeader>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
        </TabsList>

        {/* ── Inventory Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="inventory" className="mt-4 space-y-4">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Filters</p>
              {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount} active</Badge>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Search materials..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <SearchableSelect
                value={filterCategoryId}
                onChange={(v) => { setFilterCategoryId(v); setPage(1); }}
                options={[{ value: "", label: "All categories" }, ...categoryOptions]}
                placeholder="All categories"
              />
              <SearchableSelect
                value={filterSupplierId}
                onChange={(v) => { setFilterSupplierId(v); setPage(1); }}
                options={[{ value: "", label: "All suppliers" }, ...supplierOptions]}
                placeholder="All suppliers"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={filterLowStock ? "default" : "outline"}
                  className="w-full"
                  onClick={() => { setFilterLowStock((c) => !c); setPage(1); }}
                >
                  Low stock only
                </Button>
                {activeFilterCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setSearch(""); setFilterCategoryId(""); setFilterSupplierId("");
                      setFilterLowStock(false); setPage(1);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {items.length === 0 && !isLoading ? (
            <EmptyState icon={Package} title="No materials" description="Add your first material to start tracking inventory." actionLabel={canManageInventory ? "Add Material" : undefined} onAction={canManageInventory ? openAddMaterial : undefined} />
          ) : (
            <DataTable
              columns={columns} data={items} isLoading={isLoading}
              page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage}
              onRowClick={(material) => setViewMaterialId(material.id)}
            />
          )}
        </TabsContent>

        {/* ── Suppliers Tab ──────────────────────────────────────────────────── */}
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
                No suppliers yet.
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
                      {(s as any).categories && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {String((s as any).categories).split(",").filter(Boolean).map((code) => {
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

        {/* ── Procurement Tab ────────────────────────────────────────────────── */}
        <TabsContent value="procurement" className="mt-4 space-y-4">
          <Tabs value={procSubTab} onValueChange={setProcSubTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="prs"><ClipboardList className="mr-1.5 h-3.5 w-3.5" />Purchase Requests ({prs.length})</TabsTrigger>
                <TabsTrigger value="pos"><FileText className="mr-1.5 h-3.5 w-3.5" />Purchase Orders ({pos.length})</TabsTrigger>
                <TabsTrigger value="deliveries"><Truck className="mr-1.5 h-3.5 w-3.5" />Deliveries ({deliveries.length})</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                {procSubTab === "prs" && (
                  <Button size="sm" onClick={() => setShowPrForm(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New PR
                  </Button>
                )}
                {procSubTab === "pos" && (
                  <Button size="sm" onClick={() => setShowPoForm(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New PO
                  </Button>
                )}
                {procSubTab === "deliveries" && (
                  <Button size="sm" onClick={() => setShowDeliveryForm(true)}>
                    <Truck className="mr-1.5 h-3.5 w-3.5" /> Record Delivery
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="prs" className="mt-3">
              {procurementLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : prs.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No purchase requests" description="Create a purchase request to start the procurement workflow." actionLabel="New PR" onAction={() => setShowPrForm(true)} />
              ) : (
                <div className="space-y-2">
                  {prs.map((pr) => (
                    <Card key={pr.id}>
                      <CardContent className="py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{pr.prNumber}</p>
                              <Badge variant={PR_STATUS_COLORS[pr.status] as any} className="text-[10px]">{pr.status}</Badge>
                              {pr.project && <Badge variant="outline" className="text-[10px]">{pr.project.name}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {pr._count?.items ?? pr.items?.length ?? 0} item(s) &nbsp;·&nbsp;
                              Requested by {pr.requestedBy?.firstName} {pr.requestedBy?.lastName} &nbsp;·&nbsp;
                              {new Date(pr.createdAt).toLocaleDateString()}
                            </p>
                            {pr.notes && <p className="text-xs text-muted-foreground italic">{pr.notes}</p>}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {pr.status === "DRAFT" && (
                              <Button size="sm" variant="outline" onClick={() => handlePrAction(pr.id, "submit")}>Submit</Button>
                            )}
                            {pr.status === "SUBMITTED" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handlePrAction(pr.id, "approve")}>Approve</Button>
                                <Button size="sm" variant="ghost" onClick={() => handlePrAction(pr.id, "reject")}>Reject</Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pos" className="mt-3">
              {procurementLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : pos.length === 0 ? (
                <EmptyState icon={FileText} title="No purchase orders" description="Create a purchase order to order from a supplier." actionLabel="New PO" onAction={() => setShowPoForm(true)} />
              ) : (
                <div className="space-y-2">
                  {pos.map((po) => (
                    <Card key={po.id}>
                      <CardContent className="py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{po.poNumber}</p>
                              <Badge variant={PO_STATUS_COLORS[po.status] as any} className="text-[10px]">{po.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {po.supplier?.name} &nbsp;·&nbsp;
                              {formatCurrency(Number(po.totalAmount))} &nbsp;·&nbsp;
                              {new Date(po.createdAt).toLocaleDateString()}
                            </p>
                            {po.purchaseRequest && (
                              <p className="text-xs text-muted-foreground">Linked PR: {po.purchaseRequest.prNumber}</p>
                            )}
                            {po.expectedDelivery && (
                              <p className="text-xs text-muted-foreground">Expected: {new Date(po.expectedDelivery).toLocaleDateString()}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {po.status === "DRAFT" && (
                              <Button size="sm" variant="outline" onClick={() => handleSendPO(po.id)}>Send to Supplier</Button>
                            )}
                            {(po.status === "SENT" || po.status === "PARTIAL") && (
                              <Button size="sm" variant="outline" onClick={() => { setDeliveryPoId(po.id); setShowDeliveryForm(true); }}>
                                <Truck className="mr-1.5 h-3.5 w-3.5" /> Record Delivery
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="deliveries" className="mt-3">
              {procurementLoading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : deliveries.length === 0 ? (
                <EmptyState icon={Truck} title="No deliveries yet" description="Record a delivery against a sent purchase order." actionLabel="Record Delivery" onAction={() => setShowDeliveryForm(true)} />
              ) : (
                <div className="space-y-2">
                  {deliveries.map((dn) => (
                    <Card key={dn.id}>
                      <CardContent className="py-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {dn.purchaseOrder?.poNumber} — {dn.purchaseOrder?.supplier?.name ?? ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dn._count?.items ?? 0} item(s) &nbsp;·&nbsp;
                            Received by {dn.receivedBy?.firstName} {dn.receivedBy?.lastName} &nbsp;·&nbsp;
                            {new Date(dn.deliveryDate).toLocaleDateString()}
                          </p>
                          {dn.notes && <p className="text-xs text-muted-foreground italic">{dn.notes}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* ── PR Form Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={showPrForm} onOpenChange={setShowPrForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
            <DialogDescription>Request materials for procurement approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <SearchableSelect
                  value={prProjectId}
                  onChange={setPrProjectId}
                  options={[{ value: "", label: "No project" }, ...projectOptions]}
                  placeholder="No project"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={prNotes} onChange={(e) => setPrNotes(e.target.value)} placeholder="Reason or context" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Items *</Label>
              {prItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 rounded-md border p-3 sm:grid-cols-5">
                  <Input className="sm:col-span-2" placeholder="Description *" value={item.description} onChange={(e) => { const n = [...prItems]; n[idx].description = e.target.value; setPrItems(n); }} />
                  <Input type="number" step="0.001" min={0} placeholder="Qty *" value={item.quantity} onChange={(e) => { const n = [...prItems]; n[idx].quantity = e.target.value; setPrItems(n); }} />
                  <Input placeholder="Unit *" value={item.unit} onChange={(e) => { const n = [...prItems]; n[idx].unit = e.target.value; setPrItems(n); }} />
                  <Input type="number" step="0.01" min={0} placeholder="Est. cost" value={item.estimatedUnitCost} onChange={(e) => { const n = [...prItems]; n[idx].estimatedUnitCost = e.target.value; setPrItems(n); }} />
                  <div className="sm:col-span-4">
                    <SearchableSelect
                      value={item.materialId}
                      onChange={(v) => {
                        const n = [...prItems]; n[idx].materialId = v;
                        const m = items.find((i) => i.id === v);
                        if (m) n[idx].unit = n[idx].unit || m.unit;
                        setPrItems(n);
                      }}
                      options={[{ value: "", label: "No material (custom item)" }, ...materialOptions]}
                      placeholder="Link material (optional)"
                    />
                  </div>
                  {prItems.length > 1 && (
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => setPrItems((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPrItems((prev) => [...prev, { description: "", quantity: "", unit: "", estimatedUnitCost: "", materialId: "" }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrForm(false)} disabled={savingPr}>Cancel</Button>
            <Button onClick={handleCreatePR} disabled={savingPr || !prItems[0]?.description}>
              {savingPr ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {savingPr ? "Saving..." : "Create PR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PO Form Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={showPoForm} onOpenChange={setShowPoForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
            <DialogDescription>Issue a purchase order to a supplier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <SearchableSelect
                  value={poSupplierId}
                  onChange={setPoSupplierId}
                  options={supplierOptions}
                  placeholder="Search supplier..."
                />
              </div>
              <div className="space-y-2">
                <Label>Linked PR (optional)</Label>
                <SearchableSelect
                  value={poPrId}
                  onChange={setPoPrId}
                  options={[{ value: "", label: "No linked PR" }, ...approvedPrOptions]}
                  placeholder="No PR"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input type="date" value={poExpected} onChange={(e) => setPoExpected(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Items *</Label>
              {poItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4">
                  <Input className="sm:col-span-2" placeholder="Description *" value={item.description} onChange={(e) => { const n = [...poItems]; n[idx].description = e.target.value; setPoItems(n); }} />
                  <Input type="number" step="0.001" min={0} placeholder="Qty *" value={item.quantity} onChange={(e) => { const n = [...poItems]; n[idx].quantity = e.target.value; setPoItems(n); }} />
                  <Input type="number" step="0.01" min={0} placeholder="Unit cost *" value={item.unitCost} onChange={(e) => { const n = [...poItems]; n[idx].unitCost = e.target.value; setPoItems(n); }} />
                  <div className="sm:col-span-3">
                    <SearchableSelect
                      value={item.materialId}
                      onChange={(v) => { const n = [...poItems]; n[idx].materialId = v; setPoItems(n); }}
                      options={[{ value: "", label: "No material (custom item)" }, ...materialOptions]}
                      placeholder="Link material (optional)"
                    />
                  </div>
                  {poItems.length > 1 && (
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => setPoItems((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPoItems((prev) => [...prev, { description: "", quantity: "", unitCost: "", materialId: "" }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPoForm(false)} disabled={savingPo}>Cancel</Button>
            <Button onClick={handleCreatePO} disabled={savingPo || !poSupplierId || !poItems[0]?.description}>
              {savingPo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {savingPo ? "Saving..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delivery Form Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showDeliveryForm} onOpenChange={setShowDeliveryForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Delivery</DialogTitle>
            <DialogDescription>Record items received against a purchase order. Stock will be updated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Purchase Order *</Label>
                <SearchableSelect
                  value={deliveryPoId}
                  onChange={setDeliveryPoId}
                  options={activePOOptions}
                  placeholder="Select PO..."
                  emptyText="No sent/partial POs found"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Date *</Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="e.g. partial delivery, condition notes" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Items Received *</Label>
              {deliveryItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4">
                  <Input className="sm:col-span-2" placeholder="Description *" value={item.description} onChange={(e) => { const n = [...deliveryItems]; n[idx].description = e.target.value; setDeliveryItems(n); }} />
                  <Input type="number" step="0.001" min={0} placeholder="Qty ordered *" value={item.quantityOrdered} onChange={(e) => { const n = [...deliveryItems]; n[idx].quantityOrdered = e.target.value; setDeliveryItems(n); }} />
                  <Input type="number" step="0.001" min={0} placeholder="Qty received *" value={item.quantityReceived} onChange={(e) => { const n = [...deliveryItems]; n[idx].quantityReceived = e.target.value; setDeliveryItems(n); }} />
                  <div className="sm:col-span-3">
                    <SearchableSelect
                      value={item.materialId}
                      onChange={(v) => { const n = [...deliveryItems]; n[idx].materialId = v; setDeliveryItems(n); }}
                      options={[{ value: "", label: "No material (don't update stock)" }, ...materialOptions]}
                      placeholder="Link material (stock update)"
                    />
                  </div>
                  {deliveryItems.length > 1 && (
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => setDeliveryItems((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setDeliveryItems((prev) => [...prev, { description: "", quantityOrdered: "", quantityReceived: "", materialId: "" }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryForm(false)} disabled={savingDelivery}>Cancel</Button>
            <Button onClick={handleRecordDelivery} disabled={savingDelivery || !deliveryPoId || !deliveryItems[0]?.description}>
              {savingDelivery ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {savingDelivery ? "Saving..." : "Record Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Material Dialog ──────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) closeAddEditDialog(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMaterial ? "Edit Material" : "Add Material"}</DialogTitle>
            <DialogDescription>
              {editMaterial
                ? "Update material details. Changing price or stock requires a reason."
                : "Register a new material in your catalog."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name + Electrosales search */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Cement (50kg bag)"
                />
                <div className="w-64 shrink-0">
                  <ElectrosalesPopover
                    chosen={esProduct}
                    onSelect={(product) => {
                      setEsProduct(product);
                      setNewName(product.name);
                      setNewCost(String(product.priceExclVat || product.price));
                      setNewSku(product.sku || "");
                      setNewDescription(product.description || "");
                      if (product.uom) setNewUnit(product.uom.toLowerCase());
                      const matched = suppliers.find(
                        (s) =>
                          s.name.toLowerCase().includes("electrosales") ||
                          s.name.toLowerCase().includes((product.supplierName || "").toLowerCase()) ||
                          (product.supplierName || "").toLowerCase().includes(s.name.toLowerCase()),
                      );
                      if (matched) setNewSupplierId(matched.id);
                    }}
                    formatCurrency={formatCurrency}
                  />
                </div>
              </div>
              {esProduct && (
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs">
                  <Check className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-primary font-medium">Electrosales: {esProduct.name}</span>
                  <button
                    type="button"
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    onClick={() => setEsProduct(null)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <SearchableSelect
                value={newCategoryId}
                onChange={setNewCategoryId}
                options={[{ value: "", label: "No category" }, ...categoryOptions]}
                placeholder="Select category"
                emptyText="No categories — create one via Categories button"
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <SearchableSelect
                value={newSupplierId}
                onChange={setNewSupplierId}
                options={[{ value: "", label: "No supplier" }, ...supplierOptions]}
                placeholder="Select supplier"
              />
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
              <Input type="number" step="0.01" min={0} value={newReorderAt} onChange={(e) => setNewReorderAt(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div className="space-y-2">
              <Label>{editMaterial ? "Stock on Hand" : "Opening Stock"}</Label>
              <Input type="number" step="0.01" min={0} value={newStock} onChange={(e) => setNewStock(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Spec notes, brand, grade, etc." />
            </div>
            {editMaterial && (() => {
              const costChanged = parseFloat(newCost) !== editMaterial.unitCost;
              const stockChanged = parseFloat(newStock) !== editMaterial.currentStock;
              return (costChanged || stockChanged) ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Reason for change *
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (required — this will be logged as an immutable audit record)
                    </span>
                  </Label>
                  <Textarea
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Price correction from supplier invoice #1234, stock count after physical audit…"
                  />
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddEditDialog} disabled={creatingMaterial}>Cancel</Button>
            <Button
              onClick={editMaterial ? handleUpdateMaterial : handleAddMaterial}
              disabled={!newName || !newUnit || !newCost || creatingMaterial || (
                editMaterial
                  ? ((parseFloat(newCost) !== editMaterial.unitCost || parseFloat(newStock) !== editMaterial.currentStock) && !editReason.trim())
                  : false
              )}
            >
              {creatingMaterial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {creatingMaterial
                ? (editMaterial ? "Saving..." : "Adding...")
                : (editMaterial ? "Save Changes" : "Add Material")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!materialToDelete} onOpenChange={(open) => { if (!open) setMaterialToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {materialToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the material from your catalog. Existing usage logs and purchases are preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => materialToDelete && handleDeleteMaterial(materialToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Log Usage Dialog (bulk) ─────────────────────────────────────────────── */}
      <Dialog open={showLog} onOpenChange={(open) => {
        setShowLog(open);
        if (!open) { setLogProjectId(""); setLogDate(new Date().toISOString().split("T")[0]); setLogLines([emptyLogLine()]); }
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Material Usage</DialogTitle>
            <DialogDescription>Record materials consumed on a project. Stock levels are reduced automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Project *</Label>
                <SearchableSelect
                  value={logProjectId}
                  onChange={setLogProjectId}
                  options={projectOptions}
                  placeholder="Select project..."
                  emptyText="No projects found"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Materials used *</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setLogLines((l) => [...l, emptyLogLine()])}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add line
                </Button>
              </div>
              {logLines.map((line, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12 sm:items-end">
                  <div className="space-y-1 sm:col-span-5">
                    {i === 0 && <Label className="text-xs">Material *</Label>}
                    <SearchableSelect
                      value={line.materialId}
                      onChange={(v) => {
                        const mat = items.find((m) => m.id === v);
                        updateLogLine(i, { materialId: v, unitCost: mat ? String(mat.unitCost) : line.unitCost });
                      }}
                      options={materialOptions}
                      placeholder="Pick material"
                      width="w-80"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    {i === 0 && <Label className="text-xs">Qty *</Label>}
                    <Input
                      type="number" step="0.01" min={0} className="h-9"
                      value={line.qty}
                      onChange={(e) => updateLogLine(i, { qty: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    {i === 0 && <Label className="text-xs">Unit Cost</Label>}
                    <Input
                      type="number" step="0.01" min={0} className="h-9"
                      value={line.unitCost}
                      onChange={(e) => updateLogLine(i, { unitCost: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    {i === 0 && <Label className="text-xs">Notes</Label>}
                    <Input
                      className="h-9" placeholder="Optional"
                      value={line.notes}
                      onChange={(e) => updateLogLine(i, { notes: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end justify-end">
                    <Button
                      type="button" variant="ghost" size="sm" className="h-9 w-9 p-0"
                      onClick={() => setLogLines((c) => c.length <= 1 ? c : c.filter((_, idx) => idx !== i))}
                      disabled={logLines.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLog(false)} disabled={savingLog}>Cancel</Button>
            <Button onClick={handleLogUsage} disabled={savingLog || !logProjectId || !logLines[0]?.materialId}>
              {savingLog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {savingLog ? "Logging..." : "Log Usage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Manager Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Material Categories</DialogTitle>
            <DialogDescription>Manage categories for organising materials in your catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {categories.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">{c.code}</Badge>
                  </div>
                ))
              )}
            </div>
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium">New Category</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    placeholder="e.g. Electrical"
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      if (!newCatCode) {
                        setNewCatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Code *</Label>
                  <Input
                    placeholder="e.g. ELEC"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                  />
                </div>
              </div>
              <Button
                type="button" size="sm" className="w-full"
                disabled={!newCatName.trim() || !newCatCode.trim() || creatingCat}
                onClick={handleCreateCategory}
              >
                {creatingCat ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                {creatingCat ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryManager(false)}>Close</Button>
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

      <MaterialViewDrawer
        open={Boolean(viewMaterialId)}
        onOpenChange={(open) => { if (!open) setViewMaterialId(null); }}
        material={selectedViewMaterial}
        onEdit={canManageInventory ? (m) => { setViewMaterialId(null); openEditMaterial(m); } : undefined}
        onDelete={canManageInventory ? (m) => handleDeleteMaterial(m) : undefined}
      />
    </div>
  );
}
