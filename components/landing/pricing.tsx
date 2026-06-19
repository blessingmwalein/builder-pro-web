"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

interface PlanLimits {
  maxProjects: number;
  maxUsers: number;
  storageGb: number;
  perPerson?: boolean;
  extraUsersByRequest?: boolean;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  targetAccountType: string;
  monthlyPrice: number;
  annualPrice: number;
  limits: PlanLimits;
  features: string[];
  sortOrder: number;
}

const POPULAR_CODE = "TEAM";

function PlanSkeleton() {
  return (
    <div className="h-[480px] rounded-xl border border-border bg-muted animate-pulse" />
  );
}

export function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/onboarding/plans`)
      .then((r) => r.json())
      .then((data: Plan[]) => setPlans(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const perPersonPrice = (plan: Plan) =>
    billing === "monthly"
      ? Number(plan.monthlyPrice)
      : Number(plan.annualPrice) / 12;

  const maxUsers = (plan: Plan) =>
    plan.limits.maxUsers > 0 ? plan.limits.maxUsers : 50;

  return (
    <section id="pricing" className="py-20 md:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl lg:text-5xl">
            Simple, per-person pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Pay only for the people on your team. Start a 14-day free trial —
            no credit card required.
          </p>
        </div>

        {/* How it works callout — example uses actual TEAM plan price once loaded */}
        <div className="mx-auto max-w-2xl mb-10 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                How per-person pricing works:
              </span>{" "}
              You pick a plan and add your team. You&apos;re billed per person, per
              month.{" "}
              {(() => {
                const teamPlan = plans.find((p) => p.code === "TEAM");
                if (!teamPlan) return null;
                const price = Number(teamPlan.monthlyPrice);
                const example = 6;
                const total = example * price;
                return (
                  <>
                    A {teamPlan.name} plan with {example} users costs{" "}
                    <span className="text-foreground font-medium">
                      {example} × ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)} = ${total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}/month
                    </span>
                    .
                  </>
                );
              })()}
              {" "}Scale up or down any time within your plan&apos;s user cap.
            </div>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all",
              billing === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all",
              billing === "yearly"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Yearly
            <span className="ml-1.5 text-xs opacity-80">2 months free</span>
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? [1, 2, 3].map((i) => <PlanSkeleton key={i} />)
            : plans.map((plan, i) => {
                const isPopular = plan.code === POPULAR_CODE;
                const price = perPersonPrice(plan);
                const cap = maxUsers(plan);
                const totalMax = price * cap;
                const extraByRequest = plan.limits.extraUsersByRequest;
                const isEnterprise =
                  plan.code === "ENTERPRISE" ||
                  plan.targetAccountType === "ENTERPRISE";

                return (
                  <motion.div
                    key={plan.code}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className={cn(
                      "relative flex flex-col rounded-xl border p-6 transition-all",
                      isPopular
                        ? "border-primary bg-background shadow-xl shadow-primary/10 scale-[1.02]"
                        : "border-border bg-background hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                    )}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">
                        Most Popular
                      </Badge>
                    )}

                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-foreground">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">
                          ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /person/month
                        </span>
                      </div>
                      {billing === "yearly" && (
                        <p className="mt-0.5 text-xs text-primary font-medium">
                          ${Number(plan.annualPrice).toFixed(0)}/person/year — 2 months free
                        </p>
                      )}
                    </div>

                    {/* User cap & max total */}
                    <div className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Up to {cap} users · max{" "}
                        <span className="text-foreground font-medium">
                          ${totalMax % 1 === 0 ? totalMax.toFixed(0) : totalMax.toFixed(2)}/month
                        </span>
                      </span>
                      {extraByRequest && (
                        <span className="ml-1 italic">· extra users on request</span>
                      )}
                    </div>

                    <ul className="mb-6 flex-1 flex flex-col gap-2.5">
                      {plan.features
                        .filter(
                          (f) =>
                            !/^Up to \d+ users/i.test(f) &&
                            !/max \$[\d,]+\/month/i.test(f)
                        )
                        .map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className={cn(
                        "w-full h-11",
                        isPopular
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      <Link href="/register">
                        {isEnterprise
                          ? "Contact Sales"
                          : isPopular
                          ? "Start Free Trial"
                          : "Get Started"}
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
        </div>
      </div>
    </section>
  );
}
