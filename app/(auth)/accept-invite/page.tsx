"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2 } from "lucide-react";
import { acceptInviteSchema } from "@/lib/validations";
import api, { setTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoginResponse } from "@/types";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState<string | null>(null);

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
      const res = await api.public.post<LoginResponse>("/auth/accept-invite", {
        token: data.token,
        password: data.password,
      });
      setTokens(res.accessToken, res.refreshToken);
      router.push("/dashboard");
    } catch {
      setError("Failed to accept invite. The link may be expired.");
    }
  }

  return (
    <>
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
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
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
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
