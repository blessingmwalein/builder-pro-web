"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock,
  Crown,
  Loader2,
  RefreshCw,
  ShieldOff,
  Users,
} from "lucide-react";
import { useDispatch } from "react-redux";
import api, { ApiError } from "@/lib/api";
import { fetchMe } from "@/store/slices/authSlice";
import type { AppDispatch } from "@/store";
import type { AccountType, BillingCycle, Plan } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentModal } from "@/components/shared/payment-modal";
import { cn } from "@/lib/utils";

type OnboardingPlan = Plan & {
  targetAccountType: AccountType | null;
  sortOrder: number;
  limits: {
    maxUsers: number;
    maxProjects: number;
    storageGb: number;
    perPerson?: boolean;
    extraUsersByRequest?: boolean;
  };
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

const POPULAR_CODE = "TEAM";

function SubscriptionExpiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const reason = (searchParams.get("reason") ?? "") as SubscriptionErrorCode;

  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        setPlans(data.sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [router]);

  const openPayment = useCallback(
    (plan: OnboardingPlan) => {
      setPaymentPlan(plan);
      setPaymentOpen(true);
    },
    []
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

      <ReasonBanner code={reason} />

      {/* Per-person pricing explainer */}
      <div className="mx-auto max-w-2xl rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Per-person pricing:</span>{" "}
            You&apos;re billed per team member, per month. Pick the plan that fits your
            team size — you can scale up or down any time within your plan&apos;s user cap.
          </p>
        </div>
      </div>

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

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const isPopular = plan.code === POPULAR_CODE;
          const price =
            billingCycle === "ANNUAL"
              ? toMoney(plan.annualPrice) / 12
              : toMoney(plan.monthlyPrice);
          const cap = plan.limits.maxUsers > 0 ? plan.limits.maxUsers : 50;
          const totalMax = price * cap;
          const isEnterprise = plan.code === "ENTERPRISE";

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl border p-6 transition-all",
                isPopular
                  ? "border-primary bg-background shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border-border bg-background hover:border-primary/30 hover:shadow-md"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">
                  Most Popular
                </Badge>
              )}

              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  {isEnterprise && <Crown className="h-4 w-4 text-primary" />}
                  {plan.name}
                </h3>
                {plan.description && (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Per-person price */}
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">/person/month</span>
                </div>
                {billingCycle === "ANNUAL" && (
                  <p className="mt-0.5 text-xs text-primary font-medium">
                    ${toMoney(plan.annualPrice).toFixed(0)}/person/year — 2 months free
                  </p>
                )}
              </div>

              {/* User cap + max total */}
              <div className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Up to {cap} users · max{" "}
                  <span className="text-foreground font-medium">
                    ${totalMax % 1 === 0 ? totalMax.toFixed(0) : totalMax.toFixed(2)}/month
                  </span>
                </span>
                {plan.limits.extraUsersByRequest && (
                  <span className="italic">· extra users on request</span>
                )}
              </div>

              {/* Features */}
              <ul className="mb-6 flex-1 flex flex-col gap-2">
                {(plan.features ?? [])
                  .filter(
                    (f) =>
                      !/^Up to \d+ users/i.test(f) &&
                      !/max \$[\d,]+\/month/i.test(f)
                  )
                  .map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
              </ul>

              <Button
                className={cn(
                  "w-full h-11",
                  isPopular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                onClick={() => openPayment(plan)}
              >
                {isEnterprise ? "Contact Sales" : `Activate ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        All your projects, documents, quotes and invoices are preserved and will be
        instantly available once you activate a plan.
      </p>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        plan={paymentPlan}
        onSuccess={async () => {
          try {
            await dispatch(fetchMe()).unwrap();
          } catch {
            // navigate anyway if fetchMe fails
          }
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
