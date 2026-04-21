"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  createTransaction,
  fetchBudgetCategories,
} from "@/store/slices/financialsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/shared/date-picker-field";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSaved?: () => void;
}

// Categories we prefer when recording an unforeseen / overrun cost.
// `UNEXPECTED` is the default; `CONTINGENCY` is the fallback so finance
// teams can consciously eat it out of the reserve they set aside.
const PREFERRED_CODES = ["UNEXPECTED", "CONTINGENCY", "P_AND_GS"] as const;

const TODAY = () => new Date().toISOString().slice(0, 10);

export function UnexpectedCostModal({ open, onOpenChange, projectId, onSaved }: Props) {
  const dispatch = useAppDispatch();
  const { categories } = useAppSelector((s) => s.financials);

  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<string>(TODAY);
  const [reference, setReference] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) void dispatch(fetchBudgetCategories());
  }, [open, dispatch]);

  // Preselect the most appropriate category for unexpected costs the first
  // time the modal opens after categories are available.
  useEffect(() => {
    if (!open || categoryId || categories.length === 0) return;
    for (const code of PREFERRED_CODES) {
      const match = categories.find((c) => c.code === code);
      if (match) {
        setCategoryId(match.id);
        return;
      }
    }
    setCategoryId(categories[0].id);
  }, [open, categoryId, categories]);

  // Reset form each time the modal closes so a second open starts fresh.
  useEffect(() => {
    if (!open) {
      setAmount("");
      setDescription("");
      setReference("");
      setOccurredAt(TODAY());
      setCategoryId("");
    }
  }, [open]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categoryId, categories],
  );

  async function handleSave() {
    const numericAmount = Number(amount);
    if (!categoryId || !description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Category, description and a positive amount are required");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        createTransaction({
          projectId,
          categoryId,
          description: description.trim(),
          amount: numericAmount,
          occurredAt: occurredAt || new Date().toISOString().slice(0, 10),
          reference: reference.trim() || undefined,
          sourceType: "UNEXPECTED",
        }),
      ).unwrap();
      toast.success("Unexpected cost recorded");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record cost");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Record Unexpected Cost
          </DialogTitle>
          <DialogDescription>
            Log an unforeseen expense against this project &mdash; e.g. generator
            refuel, emergency repair, or overtime. It will count toward the
            selected category&rsquo;s actual spend and appear on reports.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Description *</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Generator refuel (20L diesel) after site power cut"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={categoryId || undefined}
              onValueChange={(v: string | null) => setCategoryId(v ?? "")}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory?.code === "CONTINGENCY" && (
              <p className="text-[11px] text-muted-foreground">
                This will draw from your Contingency reserve.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Occurred On</Label>
            <DatePickerField value={occurredAt || undefined} onChange={setOccurredAt} />
          </div>

          <div className="space-y-2">
            <Label>Reference</Label>
            <Input
              placeholder="Receipt #, fuel-station slip, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Cost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
