"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchInvoices } from "@/store/slices/invoicesSlice";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Receipt, CreditCard } from "lucide-react";
import api from "@/lib/api";

export default function ClientInvoicesPage() {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items: invoices } = useAppSelector((s) => s.invoices);

  useEffect(() => {
    dispatch(fetchInvoices({ limit: 50 }));
  }, [dispatch]);

  async function handlePay(invoiceId: string, amount: number) {
    try {
      const res = await api.post<{ paymentUrl: string }>("/billing/paynow/initiate", {
        invoiceId,
        amount,
        currency: "USD",
      });
      if (res.paymentUrl) window.open(res.paymentUrl, "_blank");
    } catch { /* handled */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground">View invoices and make payments.</p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Receipt className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const paidPct = inv.total > 0 ? (inv.amountPaid / inv.total) * 100 : 0;
            return (
              <Card key={inv.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{inv.invoiceNumber}</h3>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(inv.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span>{formatCurrency(inv.amountPaid)} / {formatCurrency(inv.total)}</span>
                    </div>
                    <Progress value={paidPct} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance Due</p>
                      <p className={`text-xl font-bold ${inv.balanceDue > 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {formatCurrency(inv.balanceDue)}
                      </p>
                    </div>
                    {inv.balanceDue > 0 && ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status) && (
                      <Button onClick={() => handlePay(inv.id, inv.balanceDue)}>
                        <CreditCard className="mr-2 h-4 w-4" /> Pay Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
