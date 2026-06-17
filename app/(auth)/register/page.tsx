"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, setTokens, setTenantSlug } from "@/lib/api";
import type {
  AccountType,
  RegisterResponse,
  OnboardingOptions,
} from "@/types";
import { StepAccountType } from "@/components/onboarding/step-account-type";
import { StepOwnerDetails } from "@/components/onboarding/step-owner-details";
import { StepIndividualProfile } from "@/components/onboarding/step-individual-profile";
import { StepCompanyProfile } from "@/components/onboarding/step-company-profile";
import { StepSectors } from "@/components/onboarding/step-sectors";
import { StepStakeholders } from "@/components/onboarding/step-stakeholders";
import { StepWorkflows } from "@/components/onboarding/step-workflows";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Wizard state type
// ---------------------------------------------------------------------------

type WizardData = {
  accountType: AccountType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  // company profile
  companyName: string;
  legalName: string;
  registrationNumber: string;
  taxNumber: string;
  website: string;
  companySize: string;
  yearsOperating: string;
  description: string;
  businessPhone: string;
  businessEmail: string;
  city: string;
  // individual profile
  businessName: string;
  primarySector: string;
  businessSize: string;
  serviceAreas: string[];
  // setup steps
  selectedSectors: string[];
  selectedProjectTypes: string[];
  selectedStakeholders: string[];
  selectedWorkflows: string[];
};

const INITIAL_DATA: WizardData = {
  accountType: "COMPANY",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  companyName: "",
  legalName: "",
  registrationNumber: "",
  taxNumber: "",
  website: "",
  companySize: "",
  yearsOperating: "",
  description: "",
  businessPhone: "",
  businessEmail: "",
  city: "",
  businessName: "",
  primarySector: "",
  businessSize: "",
  serviceAreas: [],
  selectedSectors: [],
  selectedProjectTypes: [],
  selectedStakeholders: [],
  selectedWorkflows: [],
};

// ---------------------------------------------------------------------------
// Step metadata
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Account type" },
  { label: "Your details" },
  { label: "Profile" },
  { label: "Sectors" },
  { label: "Team roles" },
  { label: "Workflows" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1); // 1-based, 1–6
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<OnboardingOptions | null>(null);

  // Fetch onboarding options once (used by steps 4-6)
  useEffect(() => {
    api.public
      .get<OnboardingOptions>("/onboarding/options")
      .then((res) => setOptions(res))
      .catch(() => {
        // Non-fatal — fallbacks are defined in each step component
      });
  }, []);

  function update(updates: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }

  // -------------------------------------------------------------------------
  // After step 3 → call register API
  // -------------------------------------------------------------------------
  const registerUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        accountType: data.accountType,
      };

      if (data.accountType === "COMPANY") {
        Object.assign(payload, {
          companyName: data.companyName,
          legalName: data.legalName || undefined,
          registrationNumber: data.registrationNumber || undefined,
          taxNumber: data.taxNumber || undefined,
          website: data.website || undefined,
          companySize: data.companySize || undefined,
          yearsOperating: data.yearsOperating ? Number(data.yearsOperating) : undefined,
          description: data.description || undefined,
          businessPhone: data.businessPhone || undefined,
          businessEmail: data.businessEmail || undefined,
          city: data.city || undefined,
        });
      } else {
        Object.assign(payload, {
          companyName: data.businessName, // API expects companyName regardless
          businessName: data.businessName,
          primarySector: data.primarySector || undefined,
          businessSize: data.businessSize || undefined,
          yearsOperating: data.yearsOperating ? Number(data.yearsOperating) : undefined,
          description: data.description || undefined,
          businessPhone: data.businessPhone || undefined,
          businessEmail: data.businessEmail || undefined,
          city: data.city || undefined,
          registrationNumber: data.registrationNumber || undefined,
          taxNumber: data.taxNumber || undefined,
        });
      }

      const res = await api.public.post<RegisterResponse>("/onboarding/register", payload);
      setTokens(res.accessToken, res.refreshToken);
      setTenantSlug(res.company.slug);
      setStep(4);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  // -------------------------------------------------------------------------
  // After step 6 → call setup API and redirect
  // -------------------------------------------------------------------------
  const submitSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post<Record<string, never>>("/onboarding/setup", {
        selectedSectors: data.selectedSectors,
        selectedProjectTypes: data.selectedProjectTypes,
        selectedStakeholders: data.selectedStakeholders,
        selectedWorkflows: data.selectedWorkflows,
      });
      router.replace("/subscription");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Setup failed. Please try again.";
      setError(message);
      setIsLoading(false);
    }
  }, [data, router]);

  // -------------------------------------------------------------------------
  // Step navigation
  // -------------------------------------------------------------------------
  function goNext() {
    setError(null);
    if (step === 3) {
      // Trigger register API then advance to step 4 inside the async fn
      registerUser();
      return;
    }
    if (step === 6) {
      submitSetup();
      return;
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  // -------------------------------------------------------------------------
  // Shared props for every step component
  // -------------------------------------------------------------------------
  const stepProps = {
    data,
    onChange: update,
    onNext: goNext,
    onBack: goBack,
    isLoading,
    error,
    options: options ?? undefined,
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Mobile logo */}
      <div className="mb-8 flex items-center lg:hidden">
        <Image src="/logo.png" alt="Ownit2Buildit" width={400} height={160} className="h-40 w-auto object-contain" />
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader className="px-0 pb-4 lg:px-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Step {step} of {STEPS.length}
              </span>
              <span className="font-medium text-foreground">
                {STEPS[step - 1]?.label}
              </span>
            </div>
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={[
                    "h-1.5 flex-1 rounded-full transition-colors duration-300",
                    i + 1 <= step ? "bg-primary" : "bg-muted",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 lg:px-6">
          {step === 1 && <StepAccountType {...stepProps} />}
          {step === 2 && <StepOwnerDetails {...stepProps} />}
          {step === 3 && data.accountType === "INDIVIDUAL" && (
            <StepIndividualProfile {...stepProps} />
          )}
          {step === 3 && data.accountType === "COMPANY" && (
            <StepCompanyProfile {...stepProps} />
          )}
          {step === 4 && <StepSectors {...stepProps} />}
          {step === 5 && <StepStakeholders {...stepProps} />}
          {step === 6 && <StepWorkflows {...stepProps} />}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
