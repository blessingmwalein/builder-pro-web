"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function getPasswordStrength(password: string): {
  score: number; // 0-3
  label: string;
  color: string;
} {
  if (password.length === 0) return { score: 0, label: "", color: "" };
  if (password.length < 8) return { score: 1, label: "Too short", color: "bg-destructive" };

  let score = 1;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 2, label: "Weak", color: "bg-yellow-500" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-green-500" };
  return { score: 4, label: "Strong", color: "bg-green-600" };
}

export function StepOwnerDetails({ data, onChange, onNext, isLoading, error }: StepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(data.password);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!data.firstName.trim()) errors.firstName = "First name is required";
    if (!data.lastName.trim()) errors.lastName = "Last name is required";
    if (!data.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter a valid email address";
    if (data.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (data.password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (validate()) onNext();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Your details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This creates your owner / admin account.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            placeholder="John"
          />
          {fieldErrors.firstName && (
            <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            placeholder="Smith"
          />
          {fieldErrors.lastName && (
            <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="you@company.com"
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">
          Phone Number <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+263 77 244 0088"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Create a strong password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {data.password.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={[
                    "h-1 flex-1 rounded-full transition-colors",
                    strength.score >= i ? strength.color : "bg-muted",
                  ].join(" ")}
                />
              ))}
            </div>
            {strength.label && (
              <p className="text-xs text-muted-foreground">{strength.label}</p>
            )}
          </div>
        )}
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      <Button className="w-full" onClick={handleNext} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continue
      </Button>
    </div>
  );
}
