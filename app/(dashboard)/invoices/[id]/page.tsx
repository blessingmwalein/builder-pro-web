"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send, FileDown, DollarSign, Ban } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchInvoice, sendInvoice, recordPayment, voidInvoice } from "@/store/slices/invoicesSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaymentMethod } from "@/types";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeInvoice(input: any) {
  const lineItems = Array.isArray(input?.lineItems)
    ? input.lineItems.map((item: any) => {
        const quantity = toNumber(item?.quantity);
        const unitPrice = toNumber(item?.unitPrice);
        return {
          ...item,
          quantity,
          unitPrice,
          total: toNumber(item?.total ?? item?.totalPrice, quantity * unitPrice),
        };
      })
    : [];

  return {
    ...input,
    id: toString(input?.id),
    invoiceNumber: toString(input?.invoiceNumber, "Invoice"),
    subtotal: toNumber(input?.subtotal),
    taxRate: toNumber(input?.taxRate),
    taxAmount: toNumber(input?.taxAmount),
    total: toNumber(input?.total ?? input?.totalAmount),
    amountPaid: toNumber(input?.amountPaid ?? input?.paidAmount),
    balanceDue: toNumber(
      input?.balanceDue ?? input?.balanceAmount,
      toNumber(input?.total ?? input?.totalAmount) - toNumber(input?.amountPaid ?? input?.paidAmount)
    ),
    retentionPct: toNumber(input?.retentionPct),
    lineItems,
  };
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { current: invoice } = useAppSelector((s) => s.invoices);
  const invoiceId = params.id as string;
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("BANK_TRANSFER");

  useEffect(() => {
    if (invoiceId) dispatch(fetchInvoice(invoiceId));
  }, [dispatch, invoiceId]);

  function handleRecordPayment() {
    if (!invoice || !payAmount) return;
    dispatch(recordPayment({ invoiceId: invoice.id, method: payMethod, amount: parseFloat(payAmount) }));
    setShowPayment(false);
    setPayAmount("");
  }

  if (!invoice) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  const view = normalizeInvoice(invoice);

  const paidPercent = view.total > 0 ? (view.amountPaid / view.total) * 100 : 0;

  function downloadPdf() {
    const prevTitle = document.title;
    document.title = `${view.invoiceNumber}.pdf`;
    window.print();
    document.title = prevTitle;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={view.invoiceNumber}>
        <Button variant="outline" size="sm" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <StatusBadge status={view.status} />
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {view.status === "DRAFT" && (
          <Button size="sm" onClick={() => dispatch(sendInvoice(view.id))}>
            <Send className="mr-2 h-3.5 w-3.5" /> Send to Client
          </Button>
        )}
        {["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(view.status) && (
          <Button size="sm" onClick={() => { setPayAmount(String(view.balanceDue)); setShowPayment(true); }}>
            <DollarSign className="mr-2 h-3.5 w-3.5" /> Record Payment
          </Button>
        )}
        {view.status !== "VOID" && view.status !== "PAID" && (
          <Button size="sm" variant="outline" onClick={() => dispatch(voidInvoice(view.id))}>
            <Ban className="mr-2 h-3.5 w-3.5" /> Void
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={downloadPdf}>
          <FileDown className="mr-2 h-3.5 w-3.5" /> Download PDF
        </Button>
      </div>

      {/* Payment progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Payment Progress</span>
            <span className="text-sm font-semibold">{formatCurrency(view.amountPaid)} / {formatCurrency(view.total)}</span>
          </div>
          <Progress value={paidPercent} className="h-2.5" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Balance due: <span className="font-semibold text-foreground">{formatCurrency(view.balanceDue)}</span></span>
            <span>Due: {new Date(view.dueDate).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Client</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold">{view.client?.name || "—"}</p>
            <p className="text-sm text-muted-foreground">{view.client?.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dates</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Issue Date</span><span>{new Date(view.issueDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{new Date(view.dueDate).toLocaleDateString()}</span></div>
            {view.retentionPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Retention</span><span>{view.retentionPct}%</span></div>}
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.lineItems.map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex gap-8"><span className="text-muted-foreground">Subtotal</span><span className="w-28 text-right font-medium">{formatCurrency(view.subtotal)}</span></div>
            <div className="flex gap-8"><span className="text-muted-foreground">Tax ({view.taxRate}%)</span><span className="w-28 text-right">{formatCurrency(view.taxAmount)}</span></div>
            <Separator className="w-48 my-1" />
            <div className="flex gap-8 text-base"><span className="font-semibold">Total</span><span className="w-28 text-right font-bold text-primary">{formatCurrency(view.total)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Payments history */}
      {view.payments && view.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {view.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{p.method.replace(/_/g, " ")} {p.reference ? `— ${p.reference}` : ""}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record payment dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={(v: string | null) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="ECOCASH">EcoCash</SelectItem>
                  <SelectItem value="PAYNOW">PayNow</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
