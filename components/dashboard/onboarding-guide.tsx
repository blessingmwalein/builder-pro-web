"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Settings,
  UserPlus,
  Users,
  UserCircle,
  FolderKanban,
  CheckSquare,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ownit2buildit_onboarding_complete";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  targetSelector: string;
  route?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "settings",
    title: "Configure Settings",
    description:
      "Start by setting up your company details, roles, and preferences in Settings.",
    icon: Settings,
    targetSelector: 'a[href="/settings"]',
  },
  {
    id: "invite-users",
    title: "Invite Your Team",
    description:
      "Go to Settings > Users to invite team members via email. They'll receive a link to join your workspace.",
    icon: UserPlus,
    targetSelector: 'a[href="/settings"]',
    route: "/settings/users",
  },
  {
    id: "employees",
    title: "Add Employees",
    description:
      "Register your workforce in the Employees section to assign them to projects and track their time.",
    icon: Users,
    targetSelector: 'a[href="/employees"]',
  },
  {
    id: "clients",
    title: "Add Clients",
    description:
      "Add your clients in the CRM so you can link them to projects, quotes, and invoices.",
    icon: UserCircle,
    targetSelector: 'a[href="/crm"]',
  },
  {
    id: "projects",
    title: "Create Projects",
    description:
      "Set up your first project with budgets, timelines, and team assignments.",
    icon: FolderKanban,
    targetSelector: 'a[href="/projects"]',
  },
  {
    id: "tasks",
    title: "Manage Tasks",
    description:
      "Break projects into tasks, assign them to team members, and track progress.",
    icon: CheckSquare,
    targetSelector: 'a[href="/tasks"]',
  },
];

export function useOnboardingGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so the dashboard renders first
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY);
    setShow(true);
  }

  return { show, dismiss, restart };
}

interface OnboardingGuideProps {
  open: boolean;
  onDismiss: () => void;
}

export default function OnboardingGuide({ open, onDismiss }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = ONBOARDING_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  const highlightTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!open) return;
    // Re-measure on step change & window resize
    highlightTarget();
    window.addEventListener("resize", highlightTarget);
    return () => window.removeEventListener("resize", highlightTarget);
  }, [open, currentStep, highlightTarget]);

  // Re-measure after any layout shifts
  useEffect(() => {
    if (!open) return;
    const id = setInterval(highlightTarget, 500);
    return () => clearInterval(id);
  }, [open, highlightTarget]);

  if (!open) return null;

  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  // Position the tooltip near the target element
  let tooltipStyle: React.CSSProperties = {};
  if (targetRect) {
    const tooltipWidth = 360;
    const padding = 16;
    // Place tooltip to the right of the target, vertically centered
    let left = targetRect.right + padding;
    let top = targetRect.top + targetRect.height / 2 - 100;

    // If it overflows right, place it below
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = Math.max(padding, targetRect.left);
      top = targetRect.bottom + padding;
    }
    // Keep in viewport
    top = Math.max(padding, Math.min(top, window.innerHeight - 320));
    left = Math.max(padding, left);

    tooltipStyle = { position: "fixed", top, left, width: tooltipWidth };
  } else {
    // Fallback: center on screen
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: 400,
    };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" />

      {/* Spotlight cutout on target */}
      {targetRect && (
        <div
          className="absolute rounded-lg ring-4 ring-primary/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] bg-transparent transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="z-[101] animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={tooltipStyle}
      >
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5">
            {/* Step header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                  </p>
                  <button
                    onClick={onDismiss}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close guide"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-base font-semibold text-foreground mt-0.5">
                  {step.title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {ONBOARDING_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === currentStep
                      ? "w-6 bg-primary"
                      : i < currentStep
                        ? "w-2 bg-primary/40"
                        : "w-2 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-muted-foreground"
              >
                Skip tour
              </Button>
              <div className="flex gap-2">
                {!isFirst && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" onClick={onDismiss}>
                    <Sparkles className="mr-1 h-4 w-4" />
                    Get Started
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
