"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "500+", label: "Projects Managed" },
  { value: "120+", label: "Construction Teams" },
  { value: "$2M+", label: "Invoices Processed" },
  { value: "99.9%", label: "Uptime" },
];

export function Stats() {
  return (
    <section className="py-16 bg-background border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-8 md:grid-cols-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
