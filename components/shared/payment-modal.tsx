"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Globe,
  Smartphone,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/hooks";
import type {
  BillingCycle,
  SubscriptionPaymentMethod,
  ActivateSubscriptionResponse,
  Plan,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PollResponse = {
  acknowledged: boolean;
  providerReference?: string;
  status: string;
  pollUrl?: string;
};

function toMoney(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 60;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onSuccess?: () => void;
}

export function PaymentModal({ open, onOpenChange, plan, onSuccess }: PaymentModalProps) {
  const { user } = useAuth();

  // Form
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>("PAYNOW");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");

  // State
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<ActivateSubscriptionResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const pollingRef = useRef(false);

  // Pre-fill email
  useEffect(() => {
    if (user?.email && !payerEmail) setPayerEmail(user.email);
  }, [user?.email, payerEmail]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setPendingPayment(null);
      setIsPolling(false);
      setPollStatus(null);
      setPaymentSuccess(false);
      setBillingCycle("MONTHLY");
      setPaymentMethod("PAYNOW");
      setPayerPhone("");
    } else {
      pollingRef.current = false;
    }
  }, [open]);

  // Cleanup
  useEffect(() => {
    return () => { pollingRef.current = false; };
  }, []);

  const startPolling = useCallback(
    async (reference: string, pollUrl: string) => {
      pollingRef.current = true;
      setIsPolling(true);
      setPollStatus("Waiting for payment confirmation...");

      let attempts = 0;
      while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (!pollingRef.current) break;

        try {
          const result = await api.post<PollResponse>("/billing/paynow/poll", { reference, pollUrl });

          if (result.status === "SUCCESS") {
            pollingRef.current = false;
            setIsPolling(false);
            setPaymentSuccess(true);
            setPollStatus(null);
            toast.success("Payment confirmed! Your plan has been updated.");
            onSuccess?.();
            setTimeout(() => onOpenChange(false), 1500);
            return;
          }
          setPollStatus(`Checking payment... (attempt ${attempts})`);
        } catch {
          setPollStatus("Error checking payment. Retrying...");
        }
      }

      pollingRef.current = false;
      setIsPolling(false);
      setPollStatus("Payment not yet confirmed. You can try again.");
    },
    [onSuccess, onOpenChange]
  );

  async function handlePay() {
    if (!plan) return;

    if (paymentMethod === "ECOCASH" && (!payerPhone || payerPhone.length < 10)) {
      setError("Phone number is required for EcoCash payments.");
      return;
    }

    setIsActivating(true);
    setError(null);
    setPendingPayment(null);
    setPollStatus(null);
    setPaymentSuccess(false);

    try {
      const result = await api.post<ActivateSubscriptionResponse>("/onboarding/activate-subscription", {
        planCode: plan.code,
        method: paymentMethod,
        billingCycle,
        payerEmail,
        ...(paymentMethod === "ECOCASH" && payerPhone ? { payerPhone } : {}),
      });

      setPendingPayment(result);

      if (result.paymentUrl) {
        window.open(result.paymentUrl, "_blank", "noopener,noreferrer");
      }

      if (result.pollUrl && result.providerReference) {
        void startPolling(result.providerReference, result.pollUrl);
      } else {
        toast.success("Plan updated successfully!");
        onSuccess?.();
        setTimeout(() => onOpenChange(false), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payment.");
    } finally {
      setIsActivating(false);
    }
  }

  if (!plan) return null;

  const price = billingCycle === "ANNUAL" ? toMoney(plan.annualPrice) : toMoney(plan.monthlyPrice);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPolling) onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {paymentSuccess ? "Payment Complete" : pendingPayment ? "Complete Payment" : `Upgrade to ${plan.name}`}
          </DialogTitle>
        </DialogHeader>

        {/* Success state */}
        {paymentSuccess && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <p className="text-sm text-muted-foreground">Your subscription has been updated.</p>
          </div>
        )}

        {/* Pending payment — polling */}
        {pendingPayment && !paymentSuccess && (
          <div className="space-y-4">
            {pendingPayment.paymentUrl && (
              <div className="space-y-3 text-center">
                <Globe className="mx-auto h-10 w-10 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Complete your payment in the new tab.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pendingPayment.paymentUrl!, "_blank", "noopener,noreferrer")}
                >
                  Reopen Payment Page
                </Button>
              </div>
            )}

            {pendingPayment.instructions && !pendingPayment.paymentUrl && (
              <div className="space-y-3 text-center">
                <Smartphone className="mx-auto h-10 w-10 text-primary" />
                <div className="rounded-lg bg-muted p-4 text-left text-sm">
                  <p className="font-medium">Instructions:</p>
                  <p className="mt-1 text-muted-foreground">{pendingPayment.instructions}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-center gap-2 text-sm">
              {isPolling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">{pollStatus}</span>
                </>
              ) : (
                pollStatus && <span className="text-muted-foreground">{pollStatus}</span>
              )}
            </div>

            {!isPolling && pendingPayment.pollUrl && pendingPayment.providerReference && (
              <Button
                className="w-full"
                onClick={() => startPolling(pendingPayment.providerReference!, pendingPayment.pollUrl!)}
              >
                Check Payment Again
              </Button>
            )}
          </div>
        )}

        {/* Payment form */}
        {!pendingPayment && !paymentSuccess && (
          <div className="space-y-5">
            {/* Order summary */}
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium">{billingCycle === "ANNUAL" ? "Annual" : "Monthly"}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>${price.toFixed(2)}</span>
              </div>
            </div>

            {/* Billing cycle */}
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setBillingCycle("MONTHLY")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  billingCycle === "MONTHLY"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("ANNUAL")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  billingCycle === "ANNUAL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Annual <span className="text-xs text-emerald-600 font-semibold">Save 20%</span>
              </button>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("PAYNOW")}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
                    paymentMethod === "PAYNOW" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Globe className={`h-5 w-5 ${paymentMethod === "PAYNOW" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Paynow</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("ECOCASH")}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors ${
                    paymentMethod === "ECOCASH" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Smartphone className={`h-5 w-5 ${paymentMethod === "ECOCASH" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">EcoCash</span>
                </button>
              </div>
            </div>

            {/* Payer fields */}
            <div className="space-y-2">
              <Label htmlFor="pm-email">Email</Label>
              <Input
                id="pm-email"
                type="email"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            {paymentMethod === "ECOCASH" && (
              <div className="space-y-2">
                <Label htmlFor="pm-phone">EcoCash Phone</Label>
                <Input
                  id="pm-phone"
                  type="tel"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="0777123456"
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handlePay}
              disabled={isActivating || !payerEmail}
            >
              {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay ${price.toFixed(2)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
