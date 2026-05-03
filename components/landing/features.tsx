"use client";

import {
  FolderKanban,
  DollarSign,
  Clock,
  FileText,
  Users,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: FolderKanban,
    title: "Project Tracking",
    description:
      "Monitor every project phase from start to finish. Organize tasks, set milestones, and track progress in real-time.",
  },
  {
    icon: DollarSign,
    title: "Budget Control",
    description:
      "Track costs against budgets, manage material expenses, and maintain healthy margins across all your projects.",
  },
  {
    icon: Clock,
    title: "Time Management",
    description:
      "Log hours, track employee time, approve timesheets, and export payroll data — all from one dashboard.",
  },
  {
    icon: FileText,
    title: "Quote & Invoice",
    description:
      "Create professional quotes, convert them to invoices, and track payments. Supports PayNow & EcoCash.",
  },
  {
    icon: Users,
    title: "Team Coordination",
    description:
      "Assign tasks, send messages, share documents, and keep your entire team aligned on every project.",
  },
  {
    icon: Globe,
    title: "Client Portal",
    description:
      "Give clients real-time visibility into project progress, budgets, and documents with a dedicated portal.",
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
            From the first quote to the final invoice, ownit2buildit keeps
            everything organized in one place.
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
