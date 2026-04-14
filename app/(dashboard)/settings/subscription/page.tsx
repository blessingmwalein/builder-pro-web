"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Crown, Zap } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentModal } from "@/components/shared/payment-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { SubscriptionInfo, Plan } from "@/types";

function toNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLimit(value: number): string {
  if (value < 0) return "Unlimited";
  return String(value);
}

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payment modal
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  function loadData() {
    setIsLoading(true);
    Promise.all([
      api.get<SubscriptionInfo>("/subscriptions/current"),
      api.get<Plan[]>("/subscriptions/plans"),
    ]).then(([sub, p]) => {
      setSubscription(sub);
      setPlans(p.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    }).catch(() => {}).finally(() => setIsLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  function handleChangePlan(plan: Plan) {
    const price = toNumber(plan.monthlyPrice);
    if (price === 0) {
      // Free plan — activate directly
      api.post("/onboarding/activate-subscription", {
        planCode: plan.code,
        method: "PAYNOW",
        billingCycle: "MONTHLY",
        payerEmail: "",
      }).then(() => { loadData(); }).catch(() => {});
      return;
    }
    setSelectedPlan(plan);
    setPaymentOpen(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Subscription & Billing" description="Manage your plan and payment method." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const currentPlanCode = subscription?.planCode;
  const currentPlanIndex = plans.findIndex((p) => p.code === currentPlanCode);

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription & Billing" description="Manage your plan and payment method.">
        <Button variant="outline" onClick={() => router.push("/settings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {/* Current plan card */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" /> Current Plan
              </CardTitle>
              <StatusBadge status={subscription.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">{subscription.planName}</p>
                {subscription.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{subscription.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.billingCycle || "Monthly"} billing
                </p>
              </div>
              {subscription.status === "TRIAL" && typeof subscription.trialDaysLeft === "number" && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{subscription.trialDaysLeft}</p>
                  <p className="text-xs text-muted-foreground">days left</p>
                </div>
              )}
            </div>

            {/* Usage limits */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Projects</span>
                  <span className="font-medium">{formatLimit(subscription.limits.maxProjects)}</span>
                </div>
                <Progress value={subscription.limits.maxProjects < 0 ? 5 : 30} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Users</span>
                  <span className="font-medium">{formatLimit(subscription.limits.maxUsers)}</span>
                </div>
                <Progress value={subscription.limits.maxUsers < 0 ? 5 : 40} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="font-medium">{formatLimit(subscription.limits.storageGb)} GB</span>
                </div>
                <Progress value={subscription.limits.storageGb < 0 ? 5 : 20} className="h-1.5" />
              </div>
            </div>

            {/* Features */}
            {subscription.features && subscription.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subscription.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs font-normal">{f}</Badge>
                ))}
              </div>
            )}

            {subscription.currentPeriodTo && (
              <p className="text-xs text-muted-foreground">
                Current period ends: {new Date(subscription.currentPeriodTo).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => {
            const isCurrent = currentPlanCode === plan.code;
            const price = toNumber(plan.monthlyPrice);
            const isUpgrade = index > currentPlanIndex;
            const isDowngrade = index < currentPlanIndex;

            return (
              <Card key={plan.id} className={isCurrent ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent && <Badge className="text-xs">Current</Badge>}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                    {toNumber(plan.annualPrice) > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        or ${toNumber(plan.annualPrice).toFixed(2)}/year
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{formatLimit(plan.limits.maxProjects)} projects</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{formatLimit(plan.limits.maxUsers)} users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{formatLimit(plan.limits.storageGb)} GB storage</span>
                    </div>
                    {plan.features?.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {!isCurrent && (
                    <Button
                      className="w-full"
                      variant={isUpgrade ? "default" : "outline"}
                      onClick={() => handleChangePlan(plan)}
                    >
                      {isUpgrade && <Zap className="mr-2 h-4 w-4" />}
                      {isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Switch"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment modal */}
      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        plan={selectedPlan}
        onSuccess={loadData}
      />
    </div>
  );
}
