"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchQuotes, approveQuote, rejectQuote } from "@/store/slices/quotesSlice";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, FileText } from "lucide-react";

export default function ClientQuotesPage() {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items: quotes, isLoading } = useAppSelector((s) => s.quotes);

  useEffect(() => {
    dispatch(fetchQuotes({ limit: 50 }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quotes</h1>
        <p className="text-sm text-muted-foreground">Review and approve quotes from your contractor.</p>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No quotes yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{quote.title}</h3>
                    <p className="text-xs text-muted-foreground">{quote.referenceNumber} — Issued {new Date(quote.issueDate).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={quote.status} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{formatCurrency(quote.total)}</span>
                  {quote.status === "SENT" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => dispatch(approveQuote(quote.id))}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => dispatch(rejectQuote({ id: quote.id, notes: "" }))}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>

                {quote.expiryDate && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Valid until: {new Date(quote.expiryDate).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
