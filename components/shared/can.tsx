"use client";

import type { ReactNode } from "react";
import { useHasAnyPermission } from "@/lib/hooks";

type CanProps = {
  permission?: string;
  anyOf?: readonly string[] | string[];
  fallback?: ReactNode;
  children: ReactNode;
};

export function Can({ permission, anyOf, fallback = null, children }: CanProps) {
  const keys = anyOf ? [...anyOf] : permission ? [permission] : [];
  const allowed = useHasAnyPermission(keys);
  if (keys.length === 0) return <>{children}</>;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
