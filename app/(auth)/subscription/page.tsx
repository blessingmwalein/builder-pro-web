"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck, Crown, Users, Info } from "lucide-react";
import api, { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/hooks";
import type {
  AccountType,
  BillingCycle,
  SubscriptionStatus,
  Plan,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentModal } from "@/components/shared/payment-modal";

type OnboardingPlan = Plan & {
  targetAccountType: AccountType | null;
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

export default function SubscriptionPage() {
  const router = useRouter();
  const { tenant } = useAuth();

  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [subStatus, setSubStatus] = useState<OnboardingSubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<Plan | null>(null);

  const accountType = tenant?.accountType;

  const visiblePlans = useMemo(() => {
    const filtered = plans.filter(
      (plan) => !plan.targetAccountType || !accountType || plan.targetAccountType === accountType
    );
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [plans, accountType]);

  const refreshStatus = useCallback(async () => {
    const next = await api.get<OnboardingSubscriptionStatus>("/onboarding/subscription-status");
    setSubStatus(next);
  }, []);

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

  function openPaymentForSelected() {
    const plan = visiblePlans.find((p) => p.code === selectedPlan);
    if (!plan) return;
    setPaymentPlan(plan);
    setPaymentOpen(true);
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
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-sm text-muted-foreground">
          Select the package that fits your business. Upgrade any time.
        </p>
      </div>

      {subStatus && (
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{subStatus.status.replace(/_/g, " ")}</Badge>
              <span className="font-medium">{subStatus.planName || "Not selected"}</span>
            </div>
            {typeof subStatus.trialDaysLeft === "number" && (
              <span className="text-muted-foreground">
                Trial: <span className="font-medium text-foreground">{subStatus.trialDaysLeft}</span> days left
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 max-w-sm mx-auto">
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

      {/* Horizontal plans grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {visiblePlans.map((plan) => {
          const isSelected = selectedPlan === plan.code;
          const price =
            billingCycle === "ANNUAL"
              ? toMoney(plan.annualPrice)
              : toMoney(plan.monthlyPrice);
          const isEnterprise = plan.code === "ENTERPRISE";

          return (
            <Card
              key={plan.id}
              onClick={() => setSelectedPlan(plan.code)}
              className={`flex cursor-pointer flex-col transition-all ${
                isSelected ? "ring-2 ring-primary shadow-md" : "hover:border-primary/40"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isEnterprise && <Crown className="h-4 w-4 text-primary" />}
                    {plan.name}
                  </CardTitle>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
                {plan.description && <CardDescription>{plan.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <span className="text-3xl font-bold">${price.toFixed(0)}</span>
                  <span className="text-sm text-muted-foreground">
                    /{billingCycle === "ANNUAL" ? "year" : "month"}
                  </span>
                </div>

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

                <ul className="flex-1 space-y-1.5 text-xs">
                  {(plan.features ?? []).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
                  <Users className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Need more seats than your plan allows? Reach out to your account
                    admin to discuss adding extra users.
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 max-w-md mx-auto">
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
          onClick={openPaymentForSelected}
        >
          Activate {visiblePlans.find((p) => p.code === selectedPlan)?.name || "Plan"}
        </Button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        Payment method (Paynow or EcoCash) is chosen on the next step, after you select a plan.
      </p>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        plan={paymentPlan}
        onSuccess={() => {
          void refreshStatus();
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
