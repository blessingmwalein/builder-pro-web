"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const highlights = [
  "No credit card required",
  "Free starter plan",
  "Built for Southern Africa",
];

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-85"
          style={{ backgroundImage: 'url("/images/hero-bg.png")' }}
        />
        {/* Shadow Overlay for Text Contrast */}
        <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-primary/20 blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-6 w-full relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="secondary"
              className="mb-6 px-4 py-1.5 text-xs font-medium border border-white/20 bg-white/10 text-white backdrop-blur-md shadow-lg"
            >
              The Global Standard for Construction Teams
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight text-white text-balance md:text-6xl lg:text-7xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          >
            Construction project management,{" "}
            <span className="text-primary-foreground relative inline-block">
              simplified.
              <svg className="absolute -bottom-2 left-0 w-full h-2 text-primary-foreground/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-8 max-w-2xl text-lg text-white/90 leading-relaxed text-pretty md:text-xl font-medium drop-shadow-md"
          >
            Manage projects, track budgets, coordinate teams, and keep clients
            in the loop — all from one platform built for the modern
            construction industry, everywhere.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 text-base h-12 shadow-xl shadow-black/40"
              asChild
            >
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-10 text-base h-12 border-white/30 text-white backdrop-blur-md bg-white/10 hover:bg-white/20 shadow-xl"
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {highlights.map((text) => (
              <div
                key={text}
                className="flex items-center gap-2 text-sm font-semibold text-white/80 drop-shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                {text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mx-auto mt-16 max-w-5xl"
        >
          <div className="rounded-xl border border-border bg-card p-2 shadow-2xl shadow-primary/5">
            <div className="rounded-lg bg-muted/50 p-6 md:p-8">
              {/* Mock dashboard */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-3 w-3 rounded-full bg-primary/60" />
                <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                <div className="ml-4 h-5 w-48 rounded bg-muted-foreground/10" />
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "Active Projects", value: "12", change: "+3 this month" },
                  { label: "My Tasks", value: "28", change: "5 urgent" },
                  { label: "Revenue", value: "$48,200", change: "+18% margin" },
                  { label: "Outstanding", value: "$5,400", change: "3 invoices" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-card p-4 border border-border"
                  >
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-xl font-bold text-foreground md:text-2xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-primary">{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="col-span-2 rounded-lg bg-card p-4 border border-border">
                  <p className="text-sm font-medium text-foreground mb-3">Revenue Trend</p>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 55, 35, 65, 50, 80, 70, 90, 85, 95, 75, 100].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-primary/20 hover:bg-primary/40 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-card p-4 border border-border">
                  <p className="text-sm font-medium text-foreground mb-3">Projects by Status</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "Active", pct: 60, color: "bg-primary" },
                      { label: "Draft", pct: 25, color: "bg-primary/40" },
                      { label: "Complete", pct: 15, color: "bg-muted-foreground/30" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{item.label}</span>
                          <span>{item.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${item.color}`}
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
