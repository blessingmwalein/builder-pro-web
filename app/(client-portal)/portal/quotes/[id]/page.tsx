"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
};

type PublicQuote = {
  id: string;
  quoteNumber: string;
  title: string | null;
  status: string;
  issueDate: string | null;
  expiryDate: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
  paymentTerms: string | null;
  lineItems: LineItem[];
  client: { id: string; name: string; email: string | null } | null;
  company: { name: string; defaultCurrency: string | null; logoUrl: string | null } | null;
};

function formatCurrency(amount: number, currency?: string | null) {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", ZWL: "Z$", ZAR: "R",
    ZMW: "K", NAD: "N$", BWP: "P", KES: "KSh", NGN: "₦",
  };
  const sym = currency ? (symbols[currency] ?? currency + " ") : "$";
  return `${sym}${Number(amount).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PublicQuotePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <PublicQuoteContent />
    </Suspense>
  );
}

function PublicQuoteContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const sig = searchParams.get("sig") ?? "";

  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/quotes/public/${id}?sig=${encodeURIComponent(sig)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Error ${res.status}`);
      }
      setQuote(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quote");
    } finally {
      setLoading(false);
    }
  }, [id, sig]);

  useEffect(() => {
    if (id && sig) loadQuote();
    else {
      setLoading(false);
      setError("Invalid quote link. Please use the link from your email.");
    }
  }, [id, sig, loadQuote]);

  async function handleAccept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`${API_BASE}/quotes/public/${id}/accept?sig=${encodeURIComponent(sig)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Error ${res.status}`);
      }
      setAccepted(true);
      setQuote((q) => q ? { ...q, status: "APPROVED" } : q);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "Failed to accept quote");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading quote…</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-base font-medium">{error ?? "Quote not found"}</p>
        <p className="text-sm text-muted-foreground">Please use the link provided in your email, or contact your contractor.</p>
      </div>
    );
  }

  const currency = quote.company?.defaultCurrency;
  const isSent = quote.status === "SENT";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{quote.title || "Quote"}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {quote.quoteNumber} — from {quote.company?.name ?? "your contractor"}
          </p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      {/* Accepted confirmation banner */}
      {accepted && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            You have accepted this quote. Your contractor has been notified.
          </p>
        </div>
      )}

      {/* Accept / CTA */}
      {isSent && !accepted && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-lg">{formatCurrency(quote.totalAmount, currency)}</p>
                <p className="text-sm text-muted-foreground">
                  {quote.expiryDate ? `Valid until ${formatDate(quote.expiryDate)}` : "Awaiting your response"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="gap-1.5"
                >
                  {accepting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Accept Quote
                </Button>
              </div>
            </div>
            {acceptError && (
              <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> {acceptError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quote details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Issue Date</p>
            <p className="font-medium">{formatDate(quote.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expiry Date</p>
            <p className="font-medium">{formatDate(quote.expiryDate)}</p>
          </div>
          {quote.client && (
            <div>
              <p className="text-xs text-muted-foreground">Prepared for</p>
              <p className="font-medium">{quote.client.name}</p>
            </div>
          )}
          {quote.paymentTerms && (
            <div>
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <p className="font-medium">{quote.paymentTerms}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {quote.lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 px-6 py-3 text-sm">
                <div className="col-span-7">
                  <p className="font-medium">{item.description}</p>
                  {item.category && (
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  )}
                </div>
                <div className="col-span-2 text-right text-muted-foreground">
                  {Number(item.quantity).toLocaleString()} × {formatCurrency(Number(item.unitPrice), currency)}
                </div>
                <div className="col-span-3 text-right font-medium">
                  {formatCurrency(Number(item.quantity) * Number(item.unitPrice), currency)}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="px-6 py-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(quote.subtotal, currency)}</span>
            </div>
            {Number(quote.discountAmount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>−{formatCurrency(quote.discountAmount, currency)}</span>
              </div>
            )}
            {Number(quote.taxAmount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(quote.taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(quote.totalAmount, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        This quote was issued by {quote.company?.name ?? "your contractor"}.
        For any questions, please contact them directly.
      </p>
    </div>
  );
}
