"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import {
  createBudgetCategory,
  fetchBudgetCategories,
  fetchProjectBudget,
  updateProjectBudget,
} from "@/store/slices/financialsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSaved?: () => void;
}

export function BudgetEditModal({ open, onOpenChange, projectId, onSaved }: Props) {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { categories, projectBudget } = useAppSelector((s) => s.financials);

  const [values, setValues] = useState<Record<string, number>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const budgetLines = Array.isArray(projectBudget?.lines) ? projectBudget.lines : [];

  useEffect(() => {
    if (!open) return;
    void dispatch(fetchBudgetCategories());
    void dispatch(fetchProjectBudget(projectId));
  }, [open, dispatch, projectId]);

  // Seed values from the current project budget lines when loaded.
  useEffect(() => {
    if (!open || !projectBudget) return;
    const next: Record<string, number> = {};
    budgetLines.forEach((line) => {
      next[line.categoryId] = line.plannedAmount;
    });
    setValues(next);
  }, [open, projectBudget, budgetLines]);

  const totalPlanned = useMemo(
    () => Object.values(values).reduce((s, v) => s + (v || 0), 0),
    [values],
  );

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    try {
      const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 24);
      await dispatch(createBudgetCategory({ name, code })).unwrap();
      setNewCategoryName("");
      toast.success(`Category "${name}" added`);
    } catch {
      toast.error("Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const lines = categories.map((c) => ({
        categoryId: c.id,
        plannedAmount: Number(values[c.id] ?? 0),
        thresholdPct: 0,
      }));
      await dispatch(updateProjectBudget({ projectId, lines })).unwrap();
      toast.success("Budget updated");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Project Budget</DialogTitle>
          <DialogDescription>
            Set planned spend per category. Actuals are tracked automatically from
            material logs, labour, quotes and invoices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing categories */}
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No budget categories yet. Add your first one below.
              </p>
            ) : (
              categories.map((cat) => {
                const line = budgetLines.find((l) => l.categoryId === cat.id);
                return (
                  <div
                    key={cat.id}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Actual: {formatCurrency(line?.actualAmount ?? 0)}
                        {typeof line?.variance === "number" && (
                          <>
                            {" \u00b7 "}
                            <span
                              className={
                                line.variance < 0 ? "text-destructive" : "text-emerald-600"
                              }
                            >
                              Variance: {formatCurrency(line.variance)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-9 w-40"
                      placeholder="0.00"
                      value={values[cat.id] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [cat.id]: Number(e.target.value) }))
                      }
                    />
                  </div>
                );
              })
            )}
          </div>

          <Separator />

          {/* Add new category */}
          <div className="space-y-2">
            <Label className="text-xs">Add a new category</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Plumbing, Electrical, Roofing"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
              >
                {addingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span>Total Planned</span>
            <span className="font-semibold">{formatCurrency(totalPlanned)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || categories.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
