"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import {
  createMaterialPurchase,
  fetchMaterials,
  fetchSuppliers,
} from "@/store/slices/materialsSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { DatePickerField } from "@/components/shared/date-picker-field";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  onSaved?: () => void;
}

type Line = { materialId: string; quantity: string; unitCost: string; description: string };

const emptyLine = (): Line => ({ materialId: "", quantity: "1", unitCost: "0", description: "" });

const TODAY = () => new Date().toISOString().slice(0, 10);

export function BulkPurchaseModal({ open, onOpenChange, defaultProjectId, onSaved }: Props) {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items: materials, suppliers } = useAppSelector((s) => s.materials);
  const { items: projects } = useAppSelector((s) => s.projects);

  const [supplierId, setSupplierId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "");
  const [purchaseNumber, setPurchaseNumber] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(TODAY);
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void dispatch(fetchMaterials({ limit: 200 }));
    void dispatch(fetchSuppliers({ limit: 200 }));
    void dispatch(fetchProjects({ limit: 200 }));
  }, [open, dispatch]);

  useEffect(() => {
    if (!open) {
      setSupplierId("");
      setProjectId(defaultProjectId ?? "");
      setPurchaseNumber("");
      setPurchasedAt(TODAY());
      setNotes("");
      setReceiptUrl("");
      setLines([emptyLine()]);
    }
  }, [open, defaultProjectId]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((current) => current.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function handleMaterialChange(i: number, materialId: string) {
    const mat = materials.find((m) => m.id === materialId);
    updateLine(i, {
      materialId,
      unitCost: mat ? String(mat.unitCost) : lines[i].unitCost,
    });
  }

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
        0,
      ),
    [lines],
  );

  async function handleSave() {
    const valid = lines.filter(
      (l) => l.materialId && Number(l.quantity) > 0 && Number(l.unitCost) >= 0,
    );
    if (valid.length === 0) {
      toast.error("Add at least one valid line item");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        createMaterialPurchase({
          supplierId: supplierId || undefined,
          projectId: projectId || undefined,
          purchaseNumber: purchaseNumber.trim() || undefined,
          purchasedAt,
          notes: notes.trim() || undefined,
          receiptUrl: receiptUrl.trim() || undefined,
          items: valid.map((l) => ({
            materialId: l.materialId,
            quantity: Number(l.quantity),
            unitCost: Number(l.unitCost),
            description: l.description.trim() || undefined,
          })),
        }),
      ).unwrap();
      toast.success("Purchase recorded — stock levels updated");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record purchase");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Record Bulk Material Purchase</DialogTitle>
          <DialogDescription>
            One supplier receipt, multiple line items. Stock levels update automatically,
            and if a project is linked, the total is logged as a financial transaction
            under the Materials budget category.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={supplierId || undefined} onValueChange={(v: string | null) => setSupplierId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select value={projectId || undefined} onValueChange={(v: string | null) => setProjectId(v ?? "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="General inventory (no project)" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Receipt / Invoice #</Label>
            <Input
              placeholder="e.g. ELEC-4523"
              value={purchaseNumber}
              onChange={(e) => setPurchaseNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <DatePickerField value={purchasedAt || undefined} onChange={setPurchasedAt} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Receipt URL (upload link, optional)</Label>
            <Input
              placeholder="https://drive.google.com/... (paste a link to the receipt/invoice)"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Line items</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((l) => [...l, emptyLine()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add line
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const total = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
              return (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12 sm:items-end">
                  <div className="space-y-1 sm:col-span-5">
                    {i === 0 && <Label className="text-xs">Material *</Label>}
                    <Select
                      value={line.materialId || undefined}
                      onValueChange={(v: string | null) => handleMaterialChange(i, v ?? "")}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="Pick material" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    {i === 0 && <Label className="text-xs">Qty *</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-9"
                      value={line.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    {i === 0 && <Label className="text-xs">Unit Cost</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-9"
                      value={line.unitCost}
                      onChange={(e) => updateLine(i, { unitCost: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2 text-right text-sm font-semibold">
                    {i === 0 && <Label className="text-xs block text-right">Total</Label>}
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() =>
                        setLines((current) =>
                          current.length <= 1
                            ? current
                            : current.filter((_, idx) => idx !== i),
                        )
                      }
                      disabled={lines.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-3 border-t pt-3 text-sm">
            <span className="font-semibold">Grand total</span>
            <span className="font-bold text-primary">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
