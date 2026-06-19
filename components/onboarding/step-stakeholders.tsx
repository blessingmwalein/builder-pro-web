"use client";

import { useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccountType, OnboardingOptions } from "@/types";

type WizardData = {
  accountType: AccountType;
  firstName: string; lastName: string; email: string; phone: string; password: string;
  companyName: string; legalName: string; registrationNumber: string; taxNumber: string;
  website: string; companySize: string; yearsOperating: string; description: string;
  businessPhone: string; businessEmail: string; city: string;
  businessName: string; primarySector: string; businessSize: string; serviceAreas: string[];
  selectedSectors: string[]; selectedProjectTypes: string[];
  selectedStakeholders: string[]; selectedWorkflows: string[];
  teamSize: string;
};

interface StepProps {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
  options?: OnboardingOptions;
}

const FALLBACK_STAKEHOLDERS = [
  { code: "PROJECT_MANAGER", name: "Project Manager", description: "Oversees project delivery and resources" },
  { code: "SITE_SUPERVISOR", name: "Site Supervisor", description: "Manages on-site operations and workers" },
  { code: "ESTIMATOR", name: "Estimator", description: "Prepares cost estimates and tenders" },
  { code: "FOREMAN", name: "Foreman", description: "Leads crews and coordinates daily tasks" },
  { code: "ACCOUNTANT", name: "Accountant / Finance", description: "Handles invoices, payroll, and budgets" },
  { code: "SUBCONTRACTOR", name: "Subcontractor", description: "External specialists for specific trades" },
  { code: "CLIENT", name: "Client / Owner", description: "Project owner or client representative" },
  { code: "ARCHITECT", name: "Architect / Designer", description: "Provides designs and plans" },
  { code: "QUANTITY_SURVEYOR", name: "Quantity Surveyor", description: "Manages costs and contract values" },
  { code: "SAFETY_OFFICER", name: "Safety Officer", description: "Ensures compliance with safety standards" },
  { code: "PROCUREMENT", name: "Procurement Officer", description: "Manages materials sourcing and suppliers" },
  { code: "ADMIN", name: "Administrator", description: "Handles scheduling and admin tasks" },
];

export function StepStakeholders({ data, onChange, onNext, onBack, isLoading, error, options }: StepProps) {
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const stakeholders = options?.stakeholders ?? FALLBACK_STAKEHOLDERS;

  function toggle(code: string) {
    const current = data.selectedStakeholders;
    onChange({
      selectedStakeholders: current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    });
    setSelectionError(null);
  }

  function handleNext() {
    if (data.selectedStakeholders.length === 0) {
      setSelectionError("Please select at least one role");
      return;
    }
    onNext();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Who works with you?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the roles you work with. ownit2buildit will auto-create these roles with the right permissions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stakeholders.map((s) => {
          const isSelected = data.selectedStakeholders.includes(s.code);
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => toggle(s.code)}
              className={[
                "relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
              ].join(" ")}
            >
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className="pr-6 text-sm font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </button>
          );
        })}
      </div>

      {data.selectedStakeholders.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong className="text-foreground">{data.selectedStakeholders.length}</strong> role
            {data.selectedStakeholders.length !== 1 ? "s" : ""} will be auto-created
          </span>
        </div>
      )}

      {selectionError && (
        <p className="text-xs text-destructive">{selectionError}</p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleNext} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </div>
  );
}
