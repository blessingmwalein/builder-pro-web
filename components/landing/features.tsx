"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Layers,
  TrendingUp,
  ClipboardList,
  BarChart3,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const screenshots = [
  {
    id: "dashboard",
    label: "Dashboard",
    src: "/screens/dashboard.png",
    caption: "Live overview of all your projects, budgets, and team activity in one place.",
  },
  {
    id: "projects",
    label: "Projects",
    src: "/screens/project.png",
    caption: "Manage every project stage, task, and milestone from a single screen.",
  },
  {
    id: "budget",
    label: "Budget",
    src: "/screens/proeject_budget.png",
    caption: "Real-time budget tracking with planned vs actual per category and stage.",
  },
  {
    id: "tasks",
    label: "Tasks",
    src: "/screens/tasks.png",
    caption: "Assign tasks, set deadlines, and track progress across your whole team.",
  },
  {
    id: "gantt",
    label: "Gantt Chart",
    src: "/screens/tasks-ganntt.png",
    caption: "Visual Gantt timeline keeps your schedule on track at a glance.",
  },
  {
    id: "quotes",
    label: "Quotes",
    src: "/screens/quote_creating.png",
    caption: "Generate professional quotes aligned with fiscal templates in seconds.",
  },
  {
    id: "reports",
    label: "Reports",
    src: "/screens/reports_generator.png",
    caption: "One-click financial and project reports — always audit-ready.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  const [activeScreen, setActiveScreen] = useState(0);

  return (
    <section id="features" className="py-20 md:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
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

        {/* Feature cards */}
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

        {/* Screenshot showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-24"
        >
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
              See it in action
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              A real look at the platform
            </h3>
            <p className="mt-3 text-muted-foreground">
              Tap any section below to see exactly what your team will be working with.
            </p>
          </div>

          {/* Tab strip */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {screenshots.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveScreen(i)}
                className={[
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  activeScreen === i
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Screenshot frame */}
          <div className="relative mx-auto max-w-5xl">
            {/* Browser chrome */}
            <div className="rounded-t-xl border border-border bg-muted px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                <div className="h-3 w-3 rounded-full bg-green-400/70" />
              </div>
              <div className="mx-4 flex-1 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground truncate">
                app.ownit2buildit.com / {screenshots[activeScreen].id}
              </div>
            </div>

            {/* Screenshot area */}
            <div className="relative overflow-hidden rounded-b-xl border-x border-b border-border bg-background shadow-2xl shadow-primary/5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <Image
                    src={screenshots[activeScreen].src}
                    alt={screenshots[activeScreen].label}
                    width={1280}
                    height={720}
                    className="w-full h-auto"
                    priority={activeScreen === 0}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Caption */}
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {screenshots[activeScreen].caption}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
