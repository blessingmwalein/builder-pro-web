"use client";

import {
  Building2,
  Users2,
  ShoppingCart,
  Package,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    icon: Building2,
    title: "Project Command Center",
    tagline: "End-to-end project control in one screen",
    description:
      "Manage the full project lifecycle with a stage-driven timeline. Each stage unlocks task lists, document requirements, and budget tracking. Stage gates prevent premature completion — required tasks and documents must be signed off before you advance.",
    highlights: [
      "Stage-gated workflow with visual progress tracking",
      "Per-stage task assignment, priorities, and due dates",
      "Document vault: upload, version, and approve project docs",
      "Change request management with audit trail",
    ],
    accent: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Users2,
    title: "Client CRM & Billing",
    tagline: "Quote, invoice, and get paid — all in one place",
    description:
      "Build lasting client relationships with a dedicated client portal. Send professional quotes, convert them to invoices instantly, and accept payments via PayNow and EcoCash. Clients get real-time visibility into project progress without needing to call.",
    highlights: [
      "Branded quotes and invoices in seconds",
      "One-click quote-to-invoice conversion",
      "PayNow & EcoCash payment integration",
      "Client portal with live project and document access",
    ],
    accent: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: ShoppingCart,
    title: "Supplier & Hardware Network",
    tagline: "Connect with local suppliers and streamline procurement",
    description:
      "Stop chasing quotes over WhatsApp. Link your preferred hardware stores and suppliers directly in ownit2buildit. Raise purchase requests, issue purchase orders, and track deliveries — all tied back to your project budget so you always know where the money is going.",
    highlights: [
      "Purchase Request → Purchase Order → Delivery workflow",
      "Supplier catalog with real-time unit costs",
      "Delivery confirmation and stock auto-update on receipt",
      "Budget variance alerts when procurement exceeds estimates",
    ],
    accent: "from-orange-500/10 to-orange-600/5",
    iconBg: "bg-orange-500/10 text-orange-600",
  },
  {
    icon: Package,
    title: "Materials & Stock Control",
    tagline: "Know exactly what you have, where it went, and what it cost",
    description:
      "Maintain a live inventory of all materials across projects. Track stock levels, set reorder thresholds, and log every usage event. Price and stock corrections require a mandatory reason — creating an immutable audit trail that protects against tampering and supports reconciliation.",
    highlights: [
      "Real-time stock levels with low-stock alerts",
      "Usage logs linked to projects for cost allocation",
      "Immutable audit trail for all price and stock corrections",
      "Material cost roll-up into project budget analytics",
    ],
    accent: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-purple-500/10 text-purple-600",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export function Services() {
  return (
    <section id="services" className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Services
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl lg:text-5xl">
            Built for how construction actually works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            From sourcing materials at your local hardware to handing over keys to the client — every step covered in one platform.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 md:grid-cols-2"
        >
          {services.map((service) => (
            <motion.div
              key={service.title}
              variants={itemVariants}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${service.accent} p-7 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${service.iconBg}`}>
                <service.icon className="h-6 w-6" />
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {service.tagline}
                </p>
                <h3 className="text-xl font-bold text-foreground">{service.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>

              <ul className="mt-5 space-y-2">
                {service.highlights.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
