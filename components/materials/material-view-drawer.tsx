"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Package, Pencil, Trash2 } from "lucide-react";
import type { Material } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchUsageLogs } from "@/store/slices/materialsSlice";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
  onEdit?: (m: Material) => void;
  onDelete?: (m: Material) => void;
};

export function MaterialViewDrawer({ open, onOpenChange, material, onEdit, onDelete }: Props) {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { usageLogs } = useAppSelector((s) => s.materials);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open || !material) return;
    setLoadingLogs(true);
    dispatch(fetchUsageLogs({ materialId: material.id, limit: 10 })).finally(() =>
      setLoadingLogs(false)
    );
  }, [open, material?.id]);

  const stockOnHand = Number((material as any)?.stockOnHand ?? material?.currentStock ?? 0);
  const reorderAt = Number(material?.reorderAt ?? 0);
  const isLowStock = reorderAt > 0 && stockOnHand <= reorderAt;
  const categoryName =
    (material as any)?.categoryRef?.name ?? (material as any)?.category ?? null;
  const materialLogs = usageLogs.filter((l) => l.materialId === material?.id);

  const AUDIT_TYPES = new Set(["PRICE_CHANGE", "STOCK_CORRECTION"]);
  const auditLogs = materialLogs.filter((l) => AUDIT_TYPES.has((l as any).entryType));
  const usageOnlyLogs = materialLogs.filter((l) => !AUDIT_TYPES.has((l as any).entryType));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-lg flex flex-col gap-0">
          <SheetHeader className="border-b px-6 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{material?.name || "Material"}</SheetTitle>
                  {material?.sku && (
                    <SheetDescription>SKU: {material.sku}</SheetDescription>
                  )}
                </div>
              </div>
              {material && (onEdit || onDelete) && (
                <div className="flex shrink-0 gap-1">
                  {onEdit && (
                    <Button
                      size="sm" variant="outline" className="h-7 gap-1 text-xs"
                      onClick={() => { onOpenChange(false); onEdit(material); }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </SheetHeader>

          {material ? (
            <div className="flex-1 overflow-y-auto thin-scroll px-6 py-4 space-y-5">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                {isLowStock ? (
                  <Badge variant="destructive" className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Low Stock
                  </Badge>
                ) : (
                  <Badge variant="secondary">In Stock</Badge>
                )}
                {categoryName && <Badge variant="outline">{categoryName}</Badge>}
              </div>

              {/* Stock stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Unit Cost</p>
                  <p className="text-sm font-semibold mt-1">{formatCurrency(material.unitCost)}</p>
                </div>
                <div
                  className={`rounded-lg border p-3 text-center ${
                    isLowStock ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">In Stock</p>
                  <p className={`text-sm font-semibold mt-1 ${isLowStock ? "text-destructive" : ""}`}>
                    {stockOnHand}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{material.unit}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Reorder At</p>
                  <p className="text-sm font-semibold mt-1">{reorderAt || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{material.unit}</p>
                </div>
              </div>

              {isLowStock && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Stock is below reorder level — consider purchasing more.
                  </p>
                </div>
              )}

              {/* Supplier */}
              <div className="space-y-2 text-sm">
                <p className="font-medium">Supplier</p>
                {material.supplier ? (
                  <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
                    <p className="font-medium">{material.supplier.name}</p>
                    {material.supplier.email && (
                      <p className="text-xs text-muted-foreground">{material.supplier.email}</p>
                    )}
                    {material.supplier.phone && (
                      <p className="text-xs text-muted-foreground">{material.supplier.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No supplier linked</p>
                )}
              </div>

              {/* Description */}
              {(material as any)?.description && (
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium">Notes / Spec</p>
                  <p className="rounded-lg bg-muted/30 px-3 py-2.5 text-muted-foreground leading-relaxed">
                    {(material as any).description}
                  </p>
                </div>
              )}

              <Separator />

              {/* Usage logs */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Recent Usage</p>
                {loadingLogs ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : usageOnlyLogs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No usage logs recorded yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {usageOnlyLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {log.project?.name ?? "General inventory"}
                          </p>
                          <p className="text-muted-foreground">
                            {log.quantity} {material.unit} &times; {formatCurrency(log.unitCost)}
                          </p>
                          {log.notes && (
                            <p className="text-muted-foreground truncate">{log.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="font-semibold">{formatCurrency(log.totalCost)}</p>
                          <p className="text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit trail */}
              {auditLogs.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Price / Stock Audit Trail</p>
                    <div className="space-y-1.5">
                      {auditLogs.map((log) => {
                        const type = (log as any).entryType as string;
                        return (
                          <div
                            key={log.id}
                            className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-xs dark:border-amber-800 dark:bg-amber-950/20"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {type === "PRICE_CHANGE" ? "Price Change" : "Stock Correction"}
                              </Badge>
                              <span className="text-muted-foreground">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {log.notes && (
                              <p className="mt-1 text-muted-foreground leading-relaxed">{log.notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">No material selected.</div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {material?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the material from your catalog. Existing usage logs and purchases are preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (material && onDelete) {
                  onDelete(material);
                  setConfirmDelete(false);
                  onOpenChange(false);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
