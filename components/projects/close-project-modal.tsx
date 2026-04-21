"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useFormatCurrency } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

interface ClosureTotals {
  baselineBudget: number;
  plannedBudget: number;
  actualCost: number;
  variance: number;
  materialCost: number;
  labourCost: number;
  revenueInvoiced: number;
  revenueCollected: number;
  outstanding: number;
  profit: number;
  profitMarginPct: number;
}

interface ClosureBudgetLine {
  categoryCode: string;
  categoryName: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  overBudget: boolean;
}

interface ClosureMaterialLine {
  name: string;
  unit: string;
  quantityUsed: number;
  totalCost: number;
}

interface ClosureLabourLine {
  name: string;
  hours: number;
  labourCost: number;
}

interface ClosureSummary {
  project: { id: string; name: string; code: string; status: string };
  totals: ClosureTotals;
  budgetLines: ClosureBudgetLine[];
  materials: ClosureMaterialLine[];
  labour: { totalHours: number; perEmployee: ClosureLabourLine[] };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onClosed?: () => void;
}

export function CloseProjectModal({ open, onOpenChange, projectId, onClosed }: Props) {
  const formatCurrency = useFormatCurrency();
  const [summary, setSummary] = useState<ClosureSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setSummary(null);
      setNotes("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<ClosureSummary>(`/projects/${projectId}/closure-preview`)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load closure preview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  async function handleClose() {
    setClosing(true);
    try {
      await api.post(`/projects/${projectId}/close`, { notes: notes.trim() || undefined });
      toast.success("Project closed — final snapshot saved");
      onClosed?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close project");
    } finally {
      setClosing(false);
    }
  }

  const totals = summary?.totals;
  const profitPositive = totals ? totals.profit >= 0 : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Close Project
          </DialogTitle>
          <DialogDescription>
            This marks the project COMPLETED and freezes an analytics snapshot
            (budget, materials, labour, P/L). Review before confirming.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {summary && totals && !loading && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Planned Budget</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.plannedBudget)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Actual Cost</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.actualCost)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Revenue Invoiced</p>
                <p className="text-lg font-semibold">{formatCurrency(totals.revenueInvoiced)}</p>
              </div>
              <div className={`rounded-lg border p-3 ${profitPositive ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-destructive/5"}`}>
                <p className="text-[11px] uppercase text-muted-foreground flex items-center gap-1">
                  {profitPositive ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  {profitPositive ? "Profit" : "Loss"}
                </p>
                <p className={`text-lg font-semibold ${profitPositive ? "text-emerald-700" : "text-destructive"}`}>
                  {formatCurrency(totals.profit)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({totals.profitMarginPct}%)
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold">Budget vs Actual</p>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border divide-y thin-scroll">
                  {summary.budgetLines.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">No per-category budget was set.</p>
                  ) : (
                    summary.budgetLines.map((line) => (
                      <div key={line.categoryCode} className="flex items-center justify-between p-2 text-xs">
                        <span>{line.categoryName}</span>
                        <span className={line.overBudget ? "font-medium text-destructive" : "font-medium text-emerald-700"}>
                          {formatCurrency(line.actualAmount)} / {formatCurrency(line.plannedAmount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">
                  Labour &mdash; {summary.labour.totalHours.toFixed(1)}h total ({formatCurrency(totals.labourCost)})
                </p>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border divide-y thin-scroll">
                  {summary.labour.perEmployee.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">No labour logged.</p>
                  ) : (
                    summary.labour.perEmployee.map((emp) => (
                      <div key={emp.name} className="flex items-center justify-between p-2 text-xs">
                        <span>{emp.name}</span>
                        <span className="font-medium">
                          {emp.hours.toFixed(1)}h &middot; {formatCurrency(emp.labourCost)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                <p className="mb-2 text-sm font-semibold">
                  Materials used &mdash; {formatCurrency(totals.materialCost)}
                </p>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border divide-y thin-scroll">
                  {summary.materials.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">No materials logged.</p>
                  ) : (
                    summary.materials.map((mat) => (
                      <div key={mat.name} className="flex items-center justify-between p-2 text-xs">
                        <span>{mat.name}</span>
                        <span className="font-medium">
                          {mat.quantityUsed} {mat.unit} &middot; {formatCurrency(mat.totalCost)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Closure notes (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Lessons learned, handover items, outstanding work..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={closing}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={closing || !summary}>
            {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Close Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
