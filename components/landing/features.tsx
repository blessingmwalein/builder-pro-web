"use client";

import {
  Layers,
  TrendingUp,
  ClipboardList,
  BarChart3,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Layers,
    title: "Stage-Driven Timeline",
    description:
      "Replace spreadsheets with a living project timeline. Each stage groups its own tasks, documents, and budget lines. Stage gates block completion until required items are signed off — no more skipping steps.",
  },
  {
    icon: ClipboardList,
    title: "Procurement Workflow",
    description:
      "Raise a purchase request, issue a PO, and confirm delivery — all tracked. Every purchase links back to your project budget so you see real-time cost vs. plan without manual reconciliation.",
  },
  {
    icon: TrendingUp,
    title: "Financial Analytics",
    description:
      "Budget performance, profitability, and variance — broken down per category and stage. Catch cost overruns before they compound with live alerts when spend exceeds thresholds.",
  },
  {
    icon: ShieldCheck,
    title: "Materials Audit Trail",
    description:
      "Every price change and stock correction requires a written reason and creates an immutable log. Prevents tampering, simplifies reconciliation, and gives you confidence in every number.",
  },
  {
    icon: Clock,
    title: "Time & Payroll",
    description:
      "Crew members log hours from their phone. Supervisors review and approve timesheets in one click. Export payroll data at month-end — no more chasing paper timesheets.",
  },
  {
    icon: BarChart3,
    title: "Quote & Invoice",
    description:
      "Create branded quotes in minutes, get client sign-off, and convert to an invoice instantly. Track payment status and send reminders — with PayNow and EcoCash support built in.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl lg:text-5xl">
            Everything you need to run construction projects
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            From the first quote to the final handover — one platform that keeps every project on track and every number honest.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
