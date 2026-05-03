"use client";

import { motion } from "framer-motion";
import { UserPlus, LayoutDashboard, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Account",
    description:
      "Sign up for free in under 2 minutes. No credit card needed. Start with our Starter plan and upgrade as you grow.",
  },
  {
    icon: LayoutDashboard,
    step: "02",
    title: "Set Up Your Projects",
    description:
      "Add your projects, invite team members, set budgets, and start tracking time. Import existing data easily.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Build With Confidence",
    description:
      "Manage everything from one dashboard. Send quotes, track invoices, and keep clients updated automatically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            How It Works
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl lg:text-5xl">
            Get started in 3 simple steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Onboarding is quick and painless. Be up and running today.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute top-12 left-1/2 hidden h-px w-full bg-border md:block" />
              )}
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
                <item.icon className="h-10 w-10 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
