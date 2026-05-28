"use client";

import { useEffect, useState } from "react";
import { FileText, Hammer, Package, Receipt, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchCategoryLedger } from "@/store/slices/financialsSlice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categoryId: string;
  categoryName: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function BudgetCategoryLedgerModal({ open, onOpenChange, projectId, categoryId, categoryName }: Props) {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { categoryLedger, categoryLedgerLoading } = useAppSelector((s) => s.financials);

  const [tab, setTab] = useState("transactions");

  useEffect(() => {
    if (open && categoryId) {
      void dispatch(fetchCategoryLedger({ projectId, categoryId }));
    }
  }, [open, projectId, categoryId, dispatch]);

  const ledger = categoryLedger?.category?.id === categoryId ? categoryLedger : null;

  const SOURCE_LABEL: Record<string, string> = {
    MANUAL: "Manual",
    MATERIAL: "Materials",
    LABOUR: "Labour",
    EQUIPMENT: "Equipment",
    OVERHEAD: "Overhead",
    TRANSPORT: "Transport",
    UNEXPECTED: "Unexpected",
    OTHER: "Other",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            {categoryName} — Financial Ledger
          </DialogTitle>
          {ledger?.budget && (
            <DialogDescription className="flex flex-wrap gap-4 text-xs pt-1">
              <span>Planned: <strong>{formatCurrency(Number(ledger.budget.plannedAmount))}</strong></span>
              <span>Actual: <strong>{formatCurrency(Number(ledger.budget.actualAmount))}</strong></span>
              <span className={Number(ledger.budget.actualAmount) > Number(ledger.budget.plannedAmount) ? "text-destructive" : "text-emerald-600"}>
                Variance: <strong>{formatCurrency(Number(ledger.budget.plannedAmount) - Number(ledger.budget.actualAmount))}</strong>
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        {categoryLedgerLoading && !ledger ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col min-h-0">
            <TabsList className="shrink-0">
              <TabsTrigger value="transactions">
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Transactions ({ledger?.transactions?.length ?? 0})
              </TabsTrigger>
              {(ledger?.materialLogs?.length ?? 0) > 0 && (
                <TabsTrigger value="materials">
                  <Package className="mr-1.5 h-3.5 w-3.5" />
                  Material Usage ({ledger!.materialLogs.length})
                </TabsTrigger>
              )}
              {(ledger?.timeEntries?.length ?? 0) > 0 && (
                <TabsTrigger value="labour">
                  <Hammer className="mr-1.5 h-3.5 w-3.5" />
                  Labour ({ledger!.timeEntries.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Transactions */}
            <TabsContent value="transactions" className="flex-1 overflow-auto mt-2">
              {!ledger?.transactions?.length ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No transactions recorded against this category yet.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Source</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ref</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmt(tx.occurredAt)}</td>
                        <td className="px-3 py-2.5">
                          <p>{tx.description}</p>
                          {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{tx.vendor ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {SOURCE_LABEL[tx.sourceType] ?? tx.sourceType}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{tx.reference ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(Number(tx.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td className="px-3 py-2.5 font-semibold" colSpan={5}>Total</td>
                      <td className="px-3 py-2.5 text-right font-bold text-primary">
                        {formatCurrency(ledger.totals.transactions)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </TabsContent>

            {/* Material Usage */}
            <TabsContent value="materials" className="flex-1 overflow-auto mt-2">
              {!ledger?.materialLogs?.length ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No material usage logged.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Material</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unit Cost</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger.materialLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmt(log.usedAt)}</td>
                        <td className="px-3 py-2.5">
                          <p>{log.material?.name ?? "—"}</p>
                          {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right">{Number(log.quantity).toLocaleString()} {log.material?.unit ?? ""}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{formatCurrency(Number(log.unitCost))}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(Number(log.totalCost))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td className="px-3 py-2.5 font-semibold" colSpan={4}>Total</td>
                      <td className="px-3 py-2.5 text-right font-bold text-primary">
                        {formatCurrency(ledger.totals.materialUsage)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </TabsContent>

            {/* Labour */}
            <TabsContent value="labour" className="flex-1 overflow-auto mt-2">
              {!ledger?.timeEntries?.length ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No time entries logged.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Worker</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Reg Hrs</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">OT Hrs</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Labour Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger.timeEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmt(e.clockInAt)}</td>
                        <td className="px-3 py-2.5">
                          {e.worker ? `${e.worker.firstName} ${e.worker.lastName}` : "—"}
                          {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right">{Number(e.regularHours).toFixed(1)}h</td>
                        <td className="px-3 py-2.5 text-right">{Number(e.overtimeHours).toFixed(1)}h</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(Number(e.labourCost))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td className="px-3 py-2.5 font-semibold" colSpan={4}>Total</td>
                      <td className="px-3 py-2.5 text-right font-bold text-primary">
                        {formatCurrency(ledger.totals.labour)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
