"use client";

import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function ChatFAB() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Button
        size="lg"
        className="rounded-full h-14 px-6 shadow-2xl shadow-primary/40 flex items-center gap-2 group transition-all duration-300 hover:pr-8"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="font-semibold">Chat with Us</span>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl -z-10 group-hover:bg-primary/40 transition-colors" />
      </Button>
    </motion.div>
  );
}
