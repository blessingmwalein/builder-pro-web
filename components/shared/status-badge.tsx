"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  // Projects
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  ON_HOLD: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  COMPLETED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  // Tasks
  TODO: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  BLOCKED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  REVIEW: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  // Quotes / Invoices
  SENT: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  CONVERTED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  OVERDUE: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  VOID: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  // Time
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  // Priority
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  MEDIUM: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  HIGH: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  CRITICAL: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  // Subscription
  TRIAL: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  TRIAL_EXPIRED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  PAST_DUE: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  CANCELED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const displayNames: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  PARTIALLY_PAID: "Partial",
  PAST_DUE: "Past Due",
  TRIAL_EXPIRED: "Trial Expired",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[11px] font-semibold border-0 pointer-events-none",
        statusColors[status] || "bg-gray-100 text-gray-700",
        className
      )}
    >
      {displayNames[status] || status.replace(/_/g, " ")}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge status={priority} />;
}
