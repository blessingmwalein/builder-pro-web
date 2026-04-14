"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { acceptInviteSchema } from "@/lib/validations";
import api, { setTokens, setTenantSlug } from "@/lib/api";
import { useAppDispatch } from "@/lib/hooks";
import { fetchMe } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoginResponse } from "@/types";

function AcceptInviteForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(data: { token: string; password: string }) {
    setError(null);
    try {
      // Accept the invite and get tokens
      const res = await api.public.post<LoginResponse>("/auth/accept-invite", {
        token: data.token,
        password: data.password,
      });

      // Store tokens
      setTokens(res.accessToken, res.refreshToken);

      // Fetch user profile to hydrate Redux store + get tenant slug
      const me = await dispatch(fetchMe()).unwrap();
      setTenantSlug(me.tenant.slug);

      toast.success("Welcome to ownit2buildit! Your account is ready.");
      router.push("/dashboard");
    } catch {
      setError("Failed to accept invite. The link may be expired or already used.");
    }
  }

  if (!token) {
    return (
      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardContent className="px-0 lg:px-6 pt-6">
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Invalid invite link. No token was provided.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile-only logo */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">ownit2buildit</span>
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader className="px-0 lg:px-6">
          <CardTitle className="text-2xl font-bold">Join your team</CardTitle>
          <CardDescription>
            Set your password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 lg:px-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <input type="hidden" {...register("token")} />

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground">
                8+ characters, uppercase, number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Password & Join
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
