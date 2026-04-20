"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";

type Rule = {
  label: string;
  passed: boolean;
};

const WEAK = { label: "Weak", color: "bg-destructive", textColor: "text-destructive" };
const FAIR = { label: "Fair", color: "bg-amber-500", textColor: "text-amber-600" };
const GOOD = { label: "Good", color: "bg-sky-500", textColor: "text-sky-600" };
const STRONG = { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-600" };

export function evaluatePasswordStrength(value: string): {
  score: number; // 0..4
  rules: Rule[];
  label: string;
  color: string;
  textColor: string;
} {
  const rules: Rule[] = [
    { label: "At least 8 characters", passed: value.length >= 8 },
    { label: "Contains an uppercase letter", passed: /[A-Z]/.test(value) },
    { label: "Contains a number", passed: /[0-9]/.test(value) },
    { label: "Contains a special character", passed: /[^A-Za-z0-9]/.test(value) },
  ];
  const score = rules.filter((r) => r.passed).length;
  const tier =
    score <= 1 ? WEAK : score === 2 ? FAIR : score === 3 ? GOOD : STRONG;
  return { score, rules, ...tier };
}

export function PasswordStrength({ value }: { value: string }) {
  const strength = useMemo(() => evaluatePasswordStrength(value), [value]);

  if (!value) return null;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < strength.score ? strength.color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className={`text-xs font-medium ${strength.textColor}`}>
        {strength.label} password
      </div>
      <ul className="space-y-1 text-xs">
        {strength.rules.map((rule) => (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 ${
              rule.passed ? "text-emerald-600" : "text-muted-foreground"
            }`}
          >
            {rule.passed ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
