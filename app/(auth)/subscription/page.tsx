"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Globe,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import api, { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/hooks";
import type {
  AccountType,
  BillingCycle,
  SubscriptionPaymentMethod,
  SubscriptionStatus,
  ActivateSubscriptionResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// ---- Local types ----

type OnboardingPlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  targetAccountType: AccountType | null;
  monthlyPrice: string | number;
  annualPrice: string | number;
  limits: { maxUsers: number; storageGb: number; maxProjects: number };
  features: string[];
  sortOrder: number;
};

type OnboardingSubscriptionStatus = {
  status: SubscriptionStatus;
  planCode: string;
  planName: string;
  billingCycle?: BillingCycle;
  currentPeriodFrom?: string;
  currentPeriodTo?: string;
  trialEndsAt?: string;
  trialDaysLeft?: number;
  limits?: { maxUsers?: number; storageGb?: number; maxProjects?: number };
  isExpired?: boolean;
};

type PollResponse = {
  acknowledged: boolean;
  providerReference?: string;
  status: string;
  pollUrl?: string;
};

// ---- Helpers ----

function toMoney(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUnlimited(value: number | undefined): string {
  if (value == null) return "-";
  if (value < 0) return "Unlimited";
  return String(value);
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 60;

// ---- Component ----

export default function SubscriptionPage() {
  const router = useRouter();
  const { tenant, user } = useAuth();

  // Stepper: 1 = choose plan, 2 = payment
  const [step, setStep] = useState(1);

  // Data
  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [subStatus, setSubStatus] = useState<OnboardingSubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>("PAYNOW");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");

  // Activation
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Polling
  const [pendingPayment, setPendingPayment] = useState<ActivateSubscriptionResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const accountType = tenant?.accountType;

  const visiblePlans = useMemo(() => {
    const filtered = plans.filter(
      (plan) => !plan.targetAccountType || !accountType || plan.targetAccountType === accountType
    );
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans, accountType]);

  const selectedPlanData = visiblePlans.find((p) => p.code === selectedPlan);
  const displayPrice = selectedPlanData
    ? billingCycle === "ANNUAL"
      ? toMoney(selectedPlanData.annualPrice)
      : toMoney(selectedPlanData.monthlyPrice)
    : 0;

  // Pre-fill payer email
  useEffect(() => {
    if (user?.email && !payerEmail) {
      setPayerEmail(user.email);
    }
  }, [user?.email, payerEmail]);

  // Load plans + status
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const [plansRes, statusRes] = await Promise.all([
          api.get<OnboardingPlan[]>("/onboarding/plans"),
          api.get<OnboardingSubscriptionStatus>("/onboarding/subscription-status"),
        ]);
        if (cancelled) return;

        setPlans(plansRes);
        setSubStatus(statusRes);
        setSelectedPlan(statusRes.planCode || plansRes[0]?.code || "");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { pollingRef.current = false; };
  }, []);

  const refreshStatus = useCallback(async () => {
    const next = await api.get<OnboardingSubscriptionStatus>("/onboarding/subscription-status");
    setSubStatus(next);
    return next;
  }, []);

  // Poll payment — checks result.status === "SUCCESS"
  const startPolling = useCallback(
    async (reference: string, pollUrl: string) => {
      pollingRef.current = true;
      setIsPolling(true);
      setPollStatus("Waiting for payment confirmation...");

      let attempts = 0;

      while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (!pollingRef.current) break;

        try {
          const result = await api.post<PollResponse>("/billing/paynow/poll", {
            reference,
            pollUrl,
          });

          if (result.status === "SUCCESS") {
            pollingRef.current = false;
            setIsPolling(false);
            setPollStatus(null);
            await refreshStatus();
            toast.success("Payment confirmed! Your subscription is now active.");
            router.push("/dashboard");
            return;
          }

          setPollStatus(`Checking payment... (attempt ${attempts})`);
        } catch {
          setPollStatus("Error checking payment. Retrying...");
        }
      }

      pollingRef.current = false;
      setIsPolling(false);
      setPollStatus("Payment not yet confirmed. You can check again or continue with your trial.");
    },
    [refreshStatus, router]
  );

  async function handleActivate() {
    if (!selectedPlan) return;

    if (paymentMethod === "ECOCASH" && (!payerPhone || payerPhone.length < 10)) {
      setActivationError("Phone number is required for EcoCash payments.");
      return;
    }

    setIsActivating(true);
    setActivationError(null);
    setPendingPayment(null);
    setPollStatus(null);

    try {
      const result = await api.post<ActivateSubscriptionResponse>("/onboarding/activate-subscription", {
        planCode: selectedPlan,
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
        const nextStatus = await refreshStatus();
        if (nextStatus.status === "ACTIVE" || nextStatus.status === "TRIAL") {
          toast.success("Subscription activated!");
          router.push("/dashboard");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to activate subscription.";
      setActivationError(message);
    } finally {
      setIsActivating(false);
    }
  }

  function handleRetryPoll() {
    if (pendingPayment?.providerReference && pendingPayment?.pollUrl) {
      void startPolling(pendingPayment.providerReference, pendingPayment.pollUrl);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Step {step} of 2 — {step === 1 ? "Choose your plan" : "Payment details"}
        </p>
      </div>

      {/* ======== STEP 1: Choose Plan ======== */}
      {step === 1 && (
        <>
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Choose Your Plan</h1>
            <p className="text-sm text-muted-foreground">
              Select the plan that fits your business. You can upgrade any time.
            </p>
          </div>

          {/* Current status */}
          {subStatus && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{subStatus.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Plan</span>
                  <span className="font-medium">{subStatus.planName || "Not selected"}</span>
                </div>
                {typeof subStatus.trialDaysLeft === "number" && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trial Days Left</span>
                    <span className="font-medium">{subStatus.trialDaysLeft}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                billingCycle === "MONTHLY"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("ANNUAL")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                billingCycle === "ANNUAL"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual <span className="ml-1 text-xs text-emerald-600 font-semibold">Save 20%</span>
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid gap-4">
            {visiblePlans.map((plan) => {
              const isSelected = selectedPlan === plan.code;
              const price =
                billingCycle === "ANNUAL"
                  ? toMoney(plan.annualPrice)
                  : toMoney(plan.monthlyPrice);

              return (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary shadow-md" : "hover:border-primary/40"
                  }`}
                  onClick={() => setSelectedPlan(plan.code)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold">${price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          per {billingCycle === "ANNUAL" ? "year" : "month"}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pl-12">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-muted px-2 py-1.5 text-center">
                        <p className="text-muted-foreground">Users</p>
                        <p className="font-semibold">{formatUnlimited(plan.limits.maxUsers)}</p>
                      </div>
                      <div className="rounded-md bg-muted px-2 py-1.5 text-center">
                        <p className="text-muted-foreground">Projects</p>
                        <p className="font-semibold">{formatUnlimited(plan.limits.maxProjects)}</p>
                      </div>
                      <div className="rounded-md bg-muted px-2 py-1.5 text-center">
                        <p className="text-muted-foreground">Storage</p>
                        <p className="font-semibold">{formatUnlimited(plan.limits.storageGb)} GB</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-xs">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Continue / Skip */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/dashboard")}
            >
              Continue with Trial
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedPlan}
              onClick={() => {
                if (displayPrice === 0) {
                  void handleActivate();
                } else {
                  setStep(2);
                }
              }}
            >
              {displayPrice > 0 ? "Continue to Payment" : "Activate Free Plan"}
            </Button>
          </div>
        </>
      )}

      {/* ======== STEP 2: Payment ======== */}
      {step === 2 && !pendingPayment && (
        <>
          {/* Header with back */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to plans
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Payment Details</h1>
            <p className="text-sm text-muted-foreground">
              Complete payment to activate the{" "}
              <span className="font-medium text-foreground">{selectedPlanData?.name}</span> plan.
            </p>
          </div>

          {/* Order summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{selectedPlanData?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium">{billingCycle === "ANNUAL" ? "Annual" : "Monthly"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg">${displayPrice.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("PAYNOW")}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                  paymentMethod === "PAYNOW"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Globe className={`h-5 w-5 ${paymentMethod === "PAYNOW" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Paynow</span>
                <span className="text-xs text-muted-foreground">Web payment</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("ECOCASH")}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                  paymentMethod === "ECOCASH"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Smartphone className={`h-5 w-5 ${paymentMethod === "ECOCASH" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">EcoCash</span>
                <span className="text-xs text-muted-foreground">Mobile money</span>
              </button>
            </div>
          </div>

          {/* Payer fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payerEmail">Payer Email</Label>
              <Input
                id="payerEmail"
                type="email"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            {paymentMethod === "ECOCASH" && (
              <div className="space-y-2">
                <Label htmlFor="payerPhone">EcoCash Phone Number</Label>
                <Input
                  id="payerPhone"
                  type="tel"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="0777123456"
                />
              </div>
            )}
          </div>

          {activationError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{activationError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
              disabled={isActivating}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleActivate}
              disabled={!selectedPlan || isActivating || !payerEmail}
            >
              {isActivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay ${displayPrice.toFixed(2)}
            </Button>
          </div>
        </>
      )}

      {/* ======== Payment Pending (polling) ======== */}
      {pendingPayment && (
        <Card>
          <CardContent className="space-y-5 pt-6">
            {/* Paynow web */}
            {pendingPayment.paymentUrl && (
              <div className="space-y-3 text-center">
                <Globe className="mx-auto h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">Complete Payment</h3>
                <p className="text-sm text-muted-foreground">
                  A payment page has been opened in a new tab. Complete your payment there.
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

            {/* EcoCash mobile */}
            {pendingPayment.instructions && !pendingPayment.paymentUrl && (
              <div className="space-y-3 text-center">
                <Smartphone className="mx-auto h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">EcoCash Payment</h3>
                <div className="mx-auto max-w-sm rounded-lg bg-muted p-4 text-left text-sm">
                  <p className="font-medium">Instructions:</p>
                  <p className="mt-1 text-muted-foreground">{pendingPayment.instructions}</p>
                </div>
              </div>
            )}

            {pendingPayment.providerReference && (
              <p className="text-center text-xs text-muted-foreground">
                Reference: {pendingPayment.providerReference}
              </p>
            )}

            <Separator />

            {/* Poll status */}
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

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/dashboard")}
                disabled={isPolling}
              >
                Continue with Trial
              </Button>
              {!isPolling && pendingPayment.pollUrl && (
                <Button className="flex-1" onClick={handleRetryPoll}>
                  Check Payment Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
