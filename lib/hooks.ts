// ============================================================
// BuilderPro — Custom hooks
// ============================================================

"use client";

import { useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { useCallback } from "react";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector);

export function useAuth() {
  return useAppSelector((state) => state.auth);
}

export function usePermission(permission: string): boolean {
  const { permissions } = useAuth();
  if (!permissions) return false;

  // Check exact match or wildcard match
  return permissions.some((p) => {
    if (p === permission) return true;
    // e.g. "projects.*" matches "projects.view"
    const [pModule] = p.split(".");
    const [reqModule] = permission.split(".");
    return pModule === reqModule && p.endsWith(".*");
  });
}

export function useHasAnyPermission(perms: string[]): boolean {
  const { permissions } = useAuth();
  if (!permissions) return false;

  return perms.some((perm) =>
    permissions.some((p) => {
      if (p === perm) return true;
      const [pModule] = p.split(".");
      const [reqModule] = perm.split(".");
      return pModule === reqModule && p.endsWith(".*");
    })
  );
}

export function useFormatCurrency() {
  const { tenant } = useAuth();
  const currency = tenant?.defaultCurrency || "USD";

  return useCallback(
    (amount: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(amount),
    [currency]
  );
}
