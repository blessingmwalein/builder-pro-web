"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  FolderKanban,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const slides = [
  {
    icon: null,
    showLogo: true,
    title: "Built for the Construction Community",
    subtitle: "Your complete site-to-office platform",
    description:
      "ownit2buildit was designed specifically for builders, contractors, home owners, and construction companies. Whether you're a sole trader managing a renovation or a company running multiple large projects — we replace the paper notebooks, WhatsApp voice notes, and spreadsheets that slow your business down. Track projects, control budgets, manage your team, invoice clients, and stay compliant — all from one platform that works the way construction works.",
    color: "from-primary/25 to-primary/5",
    accent: "bg-primary",
    stats: [
      { label: "One Platform", value: "All-in-1" },
      { label: "Paper Eliminated", value: "100%" },
      { label: "Free Trial", value: "14 days" },
    ],
  },
  {
    icon: FolderKanban,
    showLogo: false,
    title: "Project Management",
    subtitle: "Everything on one screen",
    description:
      "Track every project milestone, task, and deadline in real time. No more scattered notes — your entire site schedule lives in one place. Assign tasks to team members, set due dates, and see exactly what stage each project is at. Know who is doing what and when, without a single phone call.",
    color: "from-primary/20 to-primary/5",
    accent: "bg-primary",
    stats: [
      { label: "Active Projects", value: "12" },
      { label: "Tasks Done", value: "84%" },
      { label: "On Schedule", value: "9/12" },
    ],
  },
  {
    icon: ReceiptText,
    showLogo: false,
    title: "Quotes, Invoices & Fiscal Templates",
    subtitle: "Professional documents in seconds",
    description:
      "Generate quotes and invoices aligned with fiscal requirements. Send professional documents directly to clients — no more WhatsApp PDFs or hand-written quotes. Get paid faster with clear, compliant paperwork. Budget tracking and material costs update in real time so you always know your margins.",
    color: "from-primary/15 to-primary/5",
    accent: "bg-primary",
    stats: [
      { label: "Quotes Sent", value: "34" },
      { label: "Invoiced", value: "$48k" },
      { label: "Paid", value: "92%" },
    ],
  },
];

export function ServicesSlider() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  const slide = slides[current];
  const Icon = slide.icon as React.ElementType | null;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-2xl">
        {/* Slide content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={`bg-gradient-to-br ${slide.color} p-10 md:p-14`}
          >
            <div className="grid gap-10 md:grid-cols-2 items-center">
              {/* Left: text */}
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${slide.accent} shadow-lg shrink-0 overflow-hidden`}>
                    {slide.showLogo ? (
                      <Image
                        src="/logo.png"
                        alt="ownit2buildit"
                        width={48}
                        height={48}
                        className="h-10 w-auto object-contain brightness-0 invert"
                      />
                    ) : Icon ? (
                      <Icon className="h-7 w-7 text-white" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-0.5">
                      {slide.subtitle}
                    </p>
                    <h3 className="text-xl font-bold text-white leading-tight md:text-2xl">
                      {slide.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-white/80 leading-relaxed md:text-base">
                  {slide.description}
                </p>
              </div>

              {/* Right: stats */}
              <div className="grid grid-cols-3 gap-4">
                {slide.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-white/10 border border-white/10 p-5 text-center backdrop-blur-sm"
                  >
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="mt-1.5 text-xs text-white/60 leading-tight">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls bar */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-white/10 bg-black/20">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 h-2.5 bg-white"
                    : "w-2.5 h-2.5 bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Slide counter + prev/next */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 tabular-nums">
              {current + 1} / {slides.length}
            </span>
            <button
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
