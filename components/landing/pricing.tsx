"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    description: "Perfect for freelancers and sole traders managing a few projects.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "3 active projects",
      "1 user seat",
      "1 GB storage",
      "Basic time tracking",
      "Invoice generation",
    ],
    cta: "Get Started Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Professional",
    description:
      "For small construction companies and growing teams.",
    monthlyPrice: 29.99,
    yearlyPrice: 299,
    features: [
      "20 active projects",
      "Up to 10 user seats",
      "50 GB storage",
      "Team time tracking & approval",
      "Quotes, variations & invoices",
      "Budget & financial control",
      "Messaging & Reporting",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: true,
  },
  {
    name: "Enterprise",
    description:
      "Full platform access for large construction businesses.",
    monthlyPrice: 199.99,
    yearlyPrice: 1999,
    features: [
      "Unlimited projects",
      "Unlimited user seats",
      "Unlimited storage",
      "Priority support",
      "Custom integrations",
      "White-label options",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    href: "/register",
    popular: false,
  },
];

export function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="pricing" className="py-20 md:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl lg:text-5xl">
            Plans that grow with your business
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Start free, upgrade when you need more. All plans include a 14-day
            free trial.
          </p>
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
            <span className="ml-1.5 text-xs opacity-80">Save ~17%</span>
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={cn(
                "relative flex flex-col rounded-xl border p-6 transition-all",
                plan.popular
                  ? "border-primary bg-background shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border-border bg-background hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    $
                    {billing === "monthly"
                      ? plan.monthlyPrice.toFixed(2)
                      : (plan.yearlyPrice / 12).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                {billing === "yearly" && plan.yearlyPrice > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ${plan.yearlyPrice.toFixed(2)} billed annually
                  </p>
                )}
              </div>

              <ul className="mb-6 flex-1 flex flex-col gap-2.5">
                {plan.features.map((feature) => (
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
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
