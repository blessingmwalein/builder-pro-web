"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const JOB_TITLES = [
  "Project Manager",
  "Site Manager",
  "Construction Manager",
  "Quantity Surveyor",
  "Site Supervisor",
  "Site Engineer",
  "Foreman",
  "Architect",
  "Structural Engineer",
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Health & Safety Officer",
  "Procurement Officer",
  "Accounts / Admin",
  "Plant Operator",
  "Artisan / Tradesperson",
  "General Worker",
  "Other",
] as const;

const OTHER = "Other";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function JobTitleSelect({ value, onChange, placeholder }: Props) {
  const initialIsOther = value !== "" && !JOB_TITLES.includes(value as (typeof JOB_TITLES)[number]);
  const [isOther, setIsOther] = useState(initialIsOther);

  const selectValue = isOther ? OTHER : value;

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(v: string | null) => {
          if (!v) return;
          if (v === OTHER) {
            setIsOther(true);
            onChange("");
          } else {
            setIsOther(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder || "Select a job title"} />
        </SelectTrigger>
        <SelectContent>
          {JOB_TITLES.map((title) => (
            <SelectItem key={title} value={title}>
              {title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isOther && (
        <Input
          autoFocus
          placeholder="Enter a custom job title"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
