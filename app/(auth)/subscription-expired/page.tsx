"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock,
  Crown,
  HardHat,
  Loader2,
  RefreshCw,
  ShieldOff,
  Building2,
} from "lucide-react";
import api, { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/hooks";
import type { AccountType, BillingCycle, Plan } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentModal } from "@/components/shared/payment-modal";

type OnboardingPlan = Plan & {
  targetAccountType: AccountType | null;
  sortOrder: number;
};

type SubscriptionErrorCode =
  | "TRIAL_EXPIRED"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_INACTIVE"
  | "NO_SUBSCRIPTION"
  | "";

function toMoney(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUnlimited(value: number | undefined): string {
  if (value == null) return "-";
  if (value < 0) return "∞";
  return String(value);
}

function ReasonBanner({ code }: { code: SubscriptionErrorCode }) {
  if (!code) return null;

  const config: Record<
    Exclude<SubscriptionErrorCode, "">,
    { icon: React.ReactNode; title: string; desc: string; variant: "amber" | "red" }
  > = {
    TRIAL_EXPIRED: {
      icon: <Clock className="h-5 w-5" />,
      title: "Your free trial has ended",
      desc: "Choose a plan below to keep all your projects, quotes and team data.",
      variant: "amber",
    },
    SUBSCRIPTION_EXPIRED: {
      icon: <RefreshCw className="h-5 w-5" />,
      title: "Your subscription has expired",
      desc: "Renew your plan to restore access to your account.",
      variant: "red",
    },
    SUBSCRIPTION_INACTIVE: {
      icon: <ShieldOff className="h-5 w-5" />,
      title: "Subscription is not active",
      desc: "Your account billing is not current. Select a plan to reactivate.",
      variant: "red",
    },
    NO_SUBSCRIPTION: {
      icon: <AlertTriangle className="h-5 w-5" />,
      title: "No active subscription found",
      desc: "Complete your account setup by choosing a plan below.",
      variant: "amber",
    },
  };

  const c = config[code];
  if (!c) return null;

  const colours =
    c.variant === "amber"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-red-50 border-red-200 text-red-800";

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${colours}`}>
      <span className="shrink-0 mt-0.5">{c.icon}</span>
      <div>
        <p className="font-semibold text-sm">{c.title}</p>
        <p className="text-sm opacity-80">{c.desc}</p>
      </div>
    </div>
  );
}

function SubscriptionExpiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useAuth();

  const reason = (searchParams.get("reason") ?? "") as SubscriptionErrorCode;
  const accountType = tenant?.accountType as AccountType | undefined;

  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<Plan | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await api.public.get<OnboardingPlan[]>("/onboarding/plans");
        if (cancelled) return;
        setPlans(data);
        setSelectedPlan(data[0]?.code ?? "");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Split plans by account type
  const individualPlans = useMemo(
    () => plans.filter((p) => p.targetAccountType === "INDIVIDUAL").sort((a, b) => a.sortOrder - b.sortOrder),
    [plans]
  );
  const companyPlans = useMemo(
    () => plans.filter((p) => p.targetAccountType === "COMPANY").sort((a, b) => a.sortOrder - b.sortOrder),
    [plans]
  );

  const openPayment = useCallback(
    (planCode: string) => {
      const plan = plans.find((p) => p.code === planCode);
      if (!plan) return;
      setPaymentPlan(plan);
      setSelectedPlan(planCode);
      setPaymentOpen(true);
    },
    [plans]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your account data is safe. Activate a plan to restore full access instantly.
        </p>
      </div>

      {/* Reason banner */}
      <ReasonBanner code={reason} />

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1 max-w-xs mx-auto">
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
          Annual{" "}
          <span className="ml-1 text-xs text-emerald-600 font-semibold">-20%</span>
        </button>
      </div>

      {/* Individual plans */}
      {individualPlans.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">
              For Individual Contractors &amp; Sole Traders
            </h2>
            <span className="text-xs text-muted-foreground">
              — renovations, repairs, small builds
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {individualPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                selected={selectedPlan === plan.code}
                highlighted={!accountType || accountType === "INDIVIDUAL"}
                onSelect={() => setSelectedPlan(plan.code)}
                onActivate={() => openPayment(plan.code)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Company plans */}
      {companyPlans.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">
              For Construction Companies
            </h2>
            <span className="text-xs text-muted-foreground">
              — commercial builds, large teams, multiple sites
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companyPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                selected={selectedPlan === plan.code}
                highlighted={accountType === "COMPANY"}
                onSelect={() => setSelectedPlan(plan.code)}
                onActivate={() => openPayment(plan.code)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Data safety note */}
      <p className="text-center text-xs text-muted-foreground">
        All your projects, documents, quotes and invoices are preserved and will be
        instantly available once you activate a plan.
      </p>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        plan={paymentPlan}
        onSuccess={() => {
          router.replace("/dashboard");
        }}
      />
    </div>
  );
}

export default function SubscriptionExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <SubscriptionExpiredContent />
    </Suspense>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: OnboardingPlan;
  billingCycle: BillingCycle;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
  onActivate: () => void;
}

function PlanCard({ plan, billingCycle, selected, highlighted, onSelect, onActivate }: PlanCardProps) {
  const price =
    billingCycle === "ANNUAL" ? toMoney(plan.annualPrice) : toMoney(plan.monthlyPrice);
  const isEnterprise = plan.code === "ENTERPRISE";

  return (
    <Card
      onClick={onSelect}
      className={`flex cursor-pointer flex-col transition-all ${
        selected
          ? "ring-2 ring-primary shadow-md"
          : highlighted
          ? "hover:border-primary/40"
          : "opacity-90 hover:opacity-100 hover:border-border"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {isEnterprise && <Crown className="h-4 w-4 text-primary" />}
            {plan.name}
          </CardTitle>
          {selected && (
            <Badge variant="default" className="shrink-0 text-xs">
              Selected
            </Badge>
          )}
        </div>
        {plan.description && (
          <CardDescription className="text-xs">{plan.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div>
          <span className="text-2xl font-bold">${price.toFixed(0)}</span>
          <span className="text-xs text-muted-foreground">
            /{billingCycle === "ANNUAL" ? "yr" : "mo"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="rounded bg-muted px-1.5 py-1 text-center">
            <p className="text-muted-foreground">Users</p>
            <p className="font-semibold">{formatUnlimited(plan.limits.maxUsers)}</p>
          </div>
          <div className="rounded bg-muted px-1.5 py-1 text-center">
            <p className="text-muted-foreground">Projects</p>
            <p className="font-semibold">{formatUnlimited(plan.limits.maxProjects)}</p>
          </div>
          <div className="rounded bg-muted px-1.5 py-1 text-center">
            <p className="text-muted-foreground">Storage</p>
            <p className="font-semibold">{formatUnlimited(plan.limits.storageGb)} GB</p>
          </div>
        </div>
        <Separator />

        <ul className="flex-1 space-y-1 text-xs">
          {(plan.features ?? []).slice(0, 5).map((feature) => (
            <li key={feature} className="flex items-start gap-1.5">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          size="sm"
          className="mt-auto w-full"
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
        >
          Activate {plan.name}
        </Button>
      </CardContent>
    </Card>
  );
}
