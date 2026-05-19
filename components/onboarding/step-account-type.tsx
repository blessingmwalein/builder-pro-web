"use client";

import { Building2, HardHat } from "lucide-react";
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

const ACCOUNT_TYPES: {
  value: AccountType;
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
}[] = [
  {
    value: "INDIVIDUAL",
    icon: <HardHat className="h-10 w-10" />,
    title: "Individual / Sole Contractor",
    description: "For tradespeople, renovators, sole contractors",
    bullets: [
      "Electricians & plumbers",
      "Sole traders & renovators",
      "Independent subcontractors",
      "Freelance construction workers",
    ],
  },
  {
    value: "COMPANY",
    icon: <Building2 className="h-10 w-10" />,
    title: "Company",
    description: "For construction firms, engineering companies, developers",
    bullets: [
      "Construction companies",
      "Engineering & consulting firms",
      "Property developers",
      "Multi-team project businesses",
    ],
  },
];

export function StepAccountType({ data, onChange, onNext }: StepProps) {
  function select(type: AccountType) {
    onChange({ accountType: type });
    // Short delay so the user sees the selection before advancing
    setTimeout(onNext, 150);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">How will you be using BuilderPro?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the account type that best describes you. You can change this later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACCOUNT_TYPES.map((type) => {
          const isSelected = data.accountType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => select(type.value)}
              className={[
                "flex flex-col items-start gap-4 rounded-xl border-2 p-6 text-left transition-all hover:border-primary hover:shadow-md",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-16 w-16 items-center justify-center rounded-xl",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {type.icon}
              </div>

              <div className="space-y-1">
                <p className="text-base font-semibold">{type.title}</p>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>

              <ul className="space-y-1">
                {type.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground" />
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
