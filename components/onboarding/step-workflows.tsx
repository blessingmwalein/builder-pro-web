"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

const FALLBACK_WORKFLOWS = [
  { code: "PROJECT_MGMT", name: "Project Management", description: "Track projects, tasks, milestones and timelines" },
  { code: "QUOTING", name: "Quoting & Estimating", description: "Create and send professional quotes to clients" },
  { code: "INVOICING", name: "Invoicing & Payments", description: "Invoice clients and track payment status" },
  { code: "TIME_TRACKING", name: "Time Tracking", description: "Clock in/out and track labour hours per project" },
  { code: "MATERIALS", name: "Materials & Inventory", description: "Manage stock, usage logs and reorder levels" },
  { code: "DOCUMENTS", name: "Document Management", description: "Store plans, contracts, photos and reports" },
  { code: "TEAM", name: "Team & HR", description: "Manage staff, roles and permissions" },
  { code: "CRM", name: "Client Management (CRM)", description: "Track clients, contacts and project history" },
  { code: "FINANCIALS", name: "Financial Reporting", description: "P&L, budgets, cash flow and financial dashboards" },
];

export function StepWorkflows({ data, onChange, onNext, onBack, isLoading, error, options }: StepProps) {
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const workflows = options?.workflows ?? FALLBACK_WORKFLOWS;

  function toggle(code: string) {
    const current = data.selectedWorkflows;
    onChange({
      selectedWorkflows: current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    });
    setSelectionError(null);
  }

  function enableAll() {
    onChange({ selectedWorkflows: workflows.map((w) => w.code) });
    setSelectionError(null);
  }

  function handleNext() {
    if (data.selectedWorkflows.length === 0) {
      setSelectionError("Please enable at least one workflow");
      return;
    }
    onNext();
  }

  const allEnabled = workflows.every((w) => data.selectedWorkflows.includes(w.code));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Choose your workflows</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enable the features you need. You can turn these on or off at any time.
          </p>
        </div>
        {!allEnabled && (
          <button
            type="button"
            onClick={enableAll}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Enable all
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {workflows.map((wf) => {
          const isEnabled = data.selectedWorkflows.includes(wf.code);
          return (
            <div
              key={wf.code}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{wf.name}</p>
                <p className="truncate text-xs text-muted-foreground">{wf.description}</p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => toggle(wf.code)}
                aria-label={`Toggle ${wf.name}`}
              />
            </div>
          );
        })}
      </div>

      {selectionError && (
        <p className="text-xs text-destructive">{selectionError}</p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleNext} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Finish Setup
        </Button>
      </div>
    </div>
  );
}
