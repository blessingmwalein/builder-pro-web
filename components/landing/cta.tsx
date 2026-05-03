"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CTA() {
  return (
    <section className="py-20 md:py-28 bg-primary">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground text-balance md:text-4xl lg:text-5xl">
            Ready to build smarter?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80 leading-relaxed">
            Join hundreds of construction professionals who trust
            ownit2buildit to manage their projects with efficiency and precision.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 text-base font-semibold"
              asChild
            >
              <Link href="#pricing">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/60">
            No credit card required. Free Starter plan available forever.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
