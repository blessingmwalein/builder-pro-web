"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { createEmployee } from "@/store/slices/employeesSlice";
import { createEmployeeSchema, type CreateEmployeeFormData } from "@/lib/validations";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, PaginatedResponse } from "@/types";
import { useState } from "react";

export default function NewEmployeePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.get<PaginatedResponse<User>>("/users", { limit: 100, isActive: true }).then((res) => setUsers(res.items)).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createEmployeeSchema) as any,
    defaultValues: {
      employmentType: "FULL_TIME",
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  async function onSubmit(data: CreateEmployeeFormData) {
    try {
      await dispatch(createEmployee(data)).unwrap();
      router.push("/employees");
    } catch { /* handled */ }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Add Employee">
        <Button variant="outline" onClick={() => router.push("/employees")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Employee Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>User Account *</Label>
              <Select onValueChange={(v: string | null) => setValue("userId", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Link to user account" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.userId && <p className="text-xs text-destructive">{errors.userId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Employee Code</Label>
              <Input placeholder="EMP-001" {...register("employeeCode")} />
            </div>
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input placeholder="e.g. Site Supervisor" {...register("jobTitle")} />
              {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Employment Type *</Label>
              <Select defaultValue="FULL_TIME" onValueChange={(v: string | null) => setValue("employmentType", v as "FULL_TIME" | "PART_TIME" | "SUBCONTRACTOR" | "CASUAL")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="SUBCONTRACTOR">Subcontractor</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate (USD) *</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("hourlyRate")} />
              {errors.hourlyRate && <p className="text-xs text-destructive">{errors.hourlyRate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" {...register("startDate")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/employees")}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Employee
          </Button>
        </div>
      </form>
    </div>
  );
}
