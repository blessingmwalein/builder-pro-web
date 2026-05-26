"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useHasAnyPermission } from "@/lib/hooks";

/**
 * Page-level RBAC guard. Call at the top of a dashboard page; if the current
 * user lacks ALL of the supplied permission keys (wildcard-aware), silently
 * redirects to /dashboard.
 *
 * Pass an empty array to opt out (always allowed once authenticated).
 */
export function useRequirePermission(perms: readonly string[] | string[]) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const keys = [...perms];
  const allowed = useHasAnyPermission(keys);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return; // dashboard layout already handles login redirect
    if (keys.length === 0) return;
    if (!allowed) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, allowed, keys.length, router]);

  return { allowed: keys.length === 0 ? true : allowed, isLoading };
}
