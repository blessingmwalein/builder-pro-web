"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

const FALLBACK_SECTORS = [
  { code: "RESIDENTIAL", name: "Residential Construction" },
  { code: "COMMERCIAL", name: "Commercial Construction" },
  { code: "INDUSTRIAL", name: "Industrial" },
  { code: "CIVIL", name: "Civil & Infrastructure" },
  { code: "RENOVATION", name: "Renovation & Refurbishment" },
  { code: "ELECTRICAL", name: "Electrical" },
  { code: "PLUMBING", name: "Plumbing & Drainage" },
  { code: "ROOFING", name: "Roofing" },
  { code: "PAINTING", name: "Painting & Finishing" },
  { code: "LANDSCAPING", name: "Landscaping" },
];

const FALLBACK_PROJECT_TYPES = [
  { code: "NEW_BUILD", name: "New Build" },
  { code: "EXTENSION", name: "Extension / Addition" },
  { code: "RENOVATION", name: "Renovation" },
  { code: "FIT_OUT", name: "Fit-Out" },
  { code: "MAINTENANCE", name: "Maintenance & Repairs" },
  { code: "DEMOLITION", name: "Demolition" },
  { code: "INFRASTRUCTURE", name: "Roads & Infrastructure" },
  { code: "DESIGN_BUILD", name: "Design & Build" },
];

export function StepSectors({ data, onChange, onNext, onBack, isLoading, error, options }: StepProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const sectors = options?.sectors ?? FALLBACK_SECTORS;
  const projectTypes = options?.projectTypes ?? FALLBACK_PROJECT_TYPES;

  function toggleSector(code: string) {
    const current = data.selectedSectors;
    onChange({
      selectedSectors: current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    });
  }

  function toggleProjectType(code: string) {
    const current = data.selectedProjectTypes;
    onChange({
      selectedProjectTypes: current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code],
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (data.selectedSectors.length === 0) errors.sectors = "Select at least one sector";
    if (data.selectedProjectTypes.length === 0) errors.projectTypes = "Select at least one project type";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Your sectors & project types</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the sectors and project types you work in. This helps us tailor ownit2buildit for you.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Sectors column */}
        <div className="space-y-3">
          <div>
            <p className="font-medium">Sectors</p>
            <p className="text-xs text-muted-foreground">Which industries do you operate in?</p>
          </div>
          <div className="space-y-2">
            {sectors.map((sector) => (
              <div key={sector.code} className="flex items-center gap-2">
                <Checkbox
                  id={`sector-${sector.code}`}
                  checked={data.selectedSectors.includes(sector.code)}
                  onCheckedChange={() => toggleSector(sector.code)}
                />
                <Label
                  htmlFor={`sector-${sector.code}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {sector.name}
                </Label>
              </div>
            ))}
          </div>
          {fieldErrors.sectors && (
            <p className="text-xs text-destructive">{fieldErrors.sectors}</p>
          )}
        </div>

        {/* Project types column */}
        <div className="space-y-3">
          <div>
            <p className="font-medium">Project Types</p>
            <p className="text-xs text-muted-foreground">What kind of projects do you undertake?</p>
          </div>
          <div className="space-y-2">
            {projectTypes.map((pt) => (
              <div key={pt.code} className="flex items-center gap-2">
                <Checkbox
                  id={`pt-${pt.code}`}
                  checked={data.selectedProjectTypes.includes(pt.code)}
                  onCheckedChange={() => toggleProjectType(pt.code)}
                />
                <Label
                  htmlFor={`pt-${pt.code}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {pt.name}
                </Label>
              </div>
            ))}
          </div>
          {fieldErrors.projectTypes && (
            <p className="text-xs text-destructive">{fieldErrors.projectTypes}</p>
          )}
        </div>
      </div>

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
