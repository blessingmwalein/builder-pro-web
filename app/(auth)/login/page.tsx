"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { useAppDispatch } from "@/lib/hooks";
import { login } from "@/store/slices/authSlice";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    try {
      await dispatch(login(data)).unwrap();
      router.push("/dashboard");
    } catch (err: unknown) {
      // rejectWithValue payload: { status, message, code }
      if (typeof err === "object" && err !== null && "status" in err) {
        const e = err as { status: number; message?: string };
        if (e.status === 402) {
          router.push("/subscription");
          return;
        }
        setError(e.message || "Invalid credentials. Please try again.");
        return;
      }
      if (err instanceof ApiError && err.status === 402) {
        router.push("/subscription");
        return;
      }
      const message =
        (err as { message?: string })?.message ||
        "Invalid credentials. Please try again.";
      setError(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Mobile-only logo */}
      <div className="mb-8 flex items-center lg:hidden">
        <Image src="/logo.png" alt="Ownit2Buildit" width={400} height={160} className="h-40 w-auto object-contain" />
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader className="space-y-1 px-0 lg:px-6">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your ownit2buildit account</CardDescription>
        </CardHeader>
        <CardContent className="px-0 lg:px-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Start free trial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
