"use client";

import { AlertTriangle } from "lucide-react";
import type { Material } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFormatCurrency } from "@/lib/hooks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
};

export function MaterialViewDrawer({ open, onOpenChange, material }: Props) {
  const formatCurrency = useFormatCurrency();
  const stockOnHand = Number((material as any)?.stockOnHand ?? material?.currentStock ?? 0);
  const reorderAt = Number(material?.reorderAt ?? 0);
  const isLowStock = reorderAt > 0 && stockOnHand <= reorderAt;
  const categoryName = (material as any)?.categoryRef?.name ?? (material as any)?.category ?? "Uncategorized";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{material?.name || "Material"}</SheetTitle>
          <SheetDescription>Inventory details and supplier information.</SheetDescription>
        </SheetHeader>

        {material ? (
          <div className="space-y-5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {isLowStock ? (
                <Badge variant="destructive" className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Low Stock
                </Badge>
              ) : (
                <Badge variant="secondary">In Stock</Badge>
              )}
              <Badge variant="outline">{categoryName}</Badge>
              {material.sku ? <Badge variant="outline">SKU: {material.sku}</Badge> : null}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Unit</p>
                <p className="font-medium">{material.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Unit Cost</p>
                <p className="font-medium">{formatCurrency(material.unitCost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stock On Hand</p>
                <p className="font-medium">{stockOnHand}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reorder Level</p>
                <p className="font-medium">{reorderAt || "Not set"}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <p className="font-medium">Supplier</p>
              <p>{material.supplier?.name || "No supplier linked"}</p>
              {material.supplier?.email ? (
                <p className="text-muted-foreground">{material.supplier.email}</p>
              ) : null}
              {material.supplier?.phone ? (
                <p className="text-muted-foreground">{material.supplier.phone}</p>
              ) : null}
            </div>

            {(material as any)?.description ? (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Description</p>
                  <p className="text-muted-foreground">{(material as any).description}</p>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">No material selected.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
