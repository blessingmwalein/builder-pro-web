"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Tapiwa Moyo",
    role: "Founder, Moyo Construction",
    content:
      "ownit2buildit transformed how we manage projects. Budget tracking alone saved us thousands in overruns last quarter.",
    rating: 5,
  },
  {
    name: "Chiedza Mutasa",
    role: "Project Manager, BuildRight Zim",
    content:
      "The client portal is a game-changer. Our clients love the transparency, and we spend less time on status update calls.",
    rating: 5,
  },
  {
    name: "Tendai Ncube",
    role: "Independent Contractor",
    content:
      "As a sole trader, the Individual Pro plan gives me everything I need. Quotes, invoices, time tracking — all in one place.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Trusted by builders across Southern Africa
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-primary text-primary"
                  />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-6">
                {`"${t.content}"`}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
