"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ServicesSlider } from "./services-slider";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-85"
          style={{ backgroundImage: 'url("/images/hero-bg.png")' }}
        />
        <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-primary/20 blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-6 w-full relative z-10">
        {/* Services Slider — full width, hero-sized */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <ServicesSlider />
        </motion.div>

        {/* CTA below slider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 text-base h-13 shadow-2xl shadow-black/40"
            asChild
          >
            <Link href="/register">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-12 text-base h-13 border-white/30 text-white backdrop-blur-md bg-white/10 hover:bg-white/20 shadow-xl"
            asChild
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
