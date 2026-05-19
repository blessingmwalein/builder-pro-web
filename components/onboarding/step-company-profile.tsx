"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const COMPANY_SIZES = [
  { value: "MICRO", label: "Micro", sublabel: "1–5 staff" },
  { value: "SMALL", label: "Small", sublabel: "6–20 staff" },
  { value: "MEDIUM", label: "Medium", sublabel: "21–100 staff" },
  { value: "LARGE", label: "Large", sublabel: "100+ staff" },
];

export function StepCompanyProfile({ data, onChange, onNext, onBack, isLoading, error }: StepProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!data.companyName.trim()) errors.companyName = "Company name is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Company profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your company. You can update these details later.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="companyName">
          Company Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="companyName"
          value={data.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="e.g. Apex Construction Ltd"
        />
        {fieldErrors.companyName && (
          <p className="text-xs text-destructive">{fieldErrors.companyName}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="legalName">
          Legal / Registered Name <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="legalName"
          value={data.legalName}
          onChange={(e) => onChange({ legalName: e.target.value })}
          placeholder="As it appears on official documents"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Company Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What does your company do?"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="registrationNumber">
            Registration No. <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="registrationNumber"
            value={data.registrationNumber}
            onChange={(e) => onChange({ registrationNumber: e.target.value })}
            placeholder="e.g. 12345/2020"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxNumber">
            Tax Number <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="taxNumber"
            value={data.taxNumber}
            onChange={(e) => onChange({ taxNumber: e.target.value })}
            placeholder="e.g. 2012345678"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="website">
          Website <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="website"
          type="url"
          value={data.website}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="https://yourcompany.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Company Size</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPANY_SIZES.map((size) => {
            const isSelected = data.companySize === size.value;
            return (
              <button
                key={size.value}
                type="button"
                onClick={() => onChange({ companySize: size.value })}
                className={[
                  "flex flex-col items-center rounded-lg border-2 px-3 py-3 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                ].join(" ")}
              >
                <span className="text-sm font-medium">{size.label}</span>
                <span className="text-xs text-muted-foreground">{size.sublabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="yearsOperating">
            Years Operating <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="yearsOperating"
            type="number"
            min={0}
            max={200}
            value={data.yearsOperating}
            onChange={(e) => onChange({ yearsOperating: e.target.value })}
            placeholder="e.g. 10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="e.g. Harare"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="businessPhone">
            Business Phone <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="businessPhone"
            type="tel"
            value={data.businessPhone}
            onChange={(e) => onChange({ businessPhone: e.target.value })}
            placeholder="+263 4 000 0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="businessEmail">
            Business Email <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="businessEmail"
            type="email"
            value={data.businessEmail}
            onChange={(e) => onChange({ businessEmail: e.target.value })}
            placeholder="info@company.com"
          />
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
