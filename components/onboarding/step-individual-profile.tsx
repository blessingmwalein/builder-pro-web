"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const BUSINESS_SIZES = [
  { value: "SOLO", label: "Just me", sublabel: "1 person" },
  { value: "SMALL", label: "2–5 people", sublabel: "Small team" },
  { value: "MEDIUM", label: "6–15 people", sublabel: "Growing team" },
];

const DEFAULT_SECTORS = [
  "Residential Construction",
  "Commercial Construction",
  "Industrial",
  "Civil & Infrastructure",
  "Renovation & Refurbishment",
  "Electrical",
  "Plumbing & Drainage",
  "Roofing",
  "Painting & Finishing",
  "Landscaping",
];

export function StepIndividualProfile({ data, onChange, onNext, onBack, isLoading, error, options }: StepProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const sectors = options?.sectors.map((s) => s.name) ?? DEFAULT_SECTORS;

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!data.businessName.trim()) errors.businessName = "Business name is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Your business profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your contracting business.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="businessName">
          Business / Trading Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="businessName"
          value={data.businessName}
          onChange={(e) => onChange({ businessName: e.target.value })}
          placeholder="e.g. Smith Electrical Services"
        />
        {fieldErrors.businessName && (
          <p className="text-xs text-destructive">{fieldErrors.businessName}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          About your business <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What services do you offer?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Primary Sector</Label>
        <Select
          value={data.primarySector}
          onValueChange={(v) => onChange({ primarySector: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your main sector" />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Business Size</Label>
        <div className="grid grid-cols-3 gap-2">
          {BUSINESS_SIZES.map((size) => {
            const isSelected = data.businessSize === size.value;
            return (
              <button
                key={size.value}
                type="button"
                onClick={() => onChange({ businessSize: size.value })}
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
            max={100}
            value={data.yearsOperating}
            onChange={(e) => onChange({ yearsOperating: e.target.value })}
            placeholder="e.g. 5"
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
            placeholder="+263 77 000 0000"
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
            placeholder="info@business.com"
          />
        </div>
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
