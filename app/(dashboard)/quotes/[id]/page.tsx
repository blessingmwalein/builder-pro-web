"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send, Check, X, FileDown, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchQuote, sendQuote, approveQuote, rejectQuote, convertQuote } from "@/store/slices/quotesSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function normalizeQuote(input: any) {
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
    referenceNumber: toString(input?.referenceNumber ?? input?.quoteNumber, "Quote"),
    subtotal: toNumber(input?.subtotal),
    taxRate: toNumber(input?.taxRate),
    taxAmount: toNumber(input?.taxAmount),
    discountAmount: toNumber(input?.discountAmount),
    total: toNumber(input?.total ?? input?.totalAmount),
    lineItems,
  };
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { current: quote } = useAppSelector((s) => s.quotes);
  const quoteId = params.id as string;

  useEffect(() => {
    if (quoteId) dispatch(fetchQuote(quoteId));
  }, [dispatch, quoteId]);

  if (!quote) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const view = normalizeQuote(quote);

  function downloadPdf() {
    const prevTitle = document.title;
    document.title = `${view.referenceNumber}.pdf`;
    window.print();
    document.title = prevTitle;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={view.referenceNumber}
        description={view.title}
      >
        <Button variant="outline" size="sm" onClick={() => router.push("/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <StatusBadge status={view.status} />
      </PageHeader>

      {/* Action buttons based on status */}
      <div className="flex gap-2">
        {view.status === "DRAFT" && (
          <Button size="sm" onClick={() => dispatch(sendQuote(view.id))}>
            <Send className="mr-2 h-3.5 w-3.5" />
            Send to Client
          </Button>
        )}
        {view.status === "SENT" && (
          <>
            <Button size="sm" variant="default" onClick={() => dispatch(approveQuote(view.id))}>
              <Check className="mr-2 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => dispatch(rejectQuote({ id: view.id, notes: "" }))}>
              <X className="mr-2 h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}
        {view.status === "APPROVED" && (
          <Button size="sm" onClick={() => dispatch(convertQuote(view.id))}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Convert to Invoice
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={downloadPdf}>
          <FileDown className="mr-2 h-3.5 w-3.5" />
          Download PDF
        </Button>
      </div>

      {/* Quote details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Client</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{view.client?.name || "—"}</p>
            <p className="text-sm text-muted-foreground">{view.client?.email}</p>
            <p className="text-sm text-muted-foreground">{view.client?.phone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Issue Date</span>
              <span>{new Date(view.issueDate).toLocaleDateString()}</span>
            </div>
            {view.expiryDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expiry Date</span>
                <span>{new Date(view.expiryDate).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.lineItems.map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">
                    <StatusBadge status={item.category} />
                  </TableCell>
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
            <div className="flex gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="w-28 text-right font-medium">{formatCurrency(view.subtotal)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-muted-foreground">Tax ({view.taxRate}%)</span>
              <span className="w-28 text-right">{formatCurrency(view.taxAmount)}</span>
            </div>
            {view.discountAmount > 0 && (
              <div className="flex gap-8">
                <span className="text-muted-foreground">Discount</span>
                <span className="w-28 text-right">-{formatCurrency(view.discountAmount)}</span>
              </div>
            )}
            <Separator className="w-48 my-1" />
            <div className="flex gap-8 text-base">
              <span className="font-semibold">Total</span>
              <span className="w-28 text-right font-bold text-primary">{formatCurrency(view.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(view.notes || view.paymentTerms) && (
        <div className="grid gap-6 md:grid-cols-2">
          {view.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{view.notes}</p></CardContent>
            </Card>
          )}
          {view.paymentTerms && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Terms</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{view.paymentTerms}</p></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
