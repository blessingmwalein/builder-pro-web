"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ChevronDown, Loader2 } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { useRequirePermission } from "@/lib/use-require-permission";
import { FEATURE_PERMS } from "@/lib/permissions";
import { createEmployee } from "@/store/slices/employeesSlice";
import { createEmployeeSchema, type CreateEmployeeFormData } from "@/lib/validations";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { JobTitleSelect } from "@/components/shared/job-title-select";
import { DatePickerField } from "@/components/shared/date-picker-field";
import { cn } from "@/lib/utils";
import type { User, PaginatedResponse } from "@/types";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function UserSearchSelect({
  value,
  onChange,
  users,
}: {
  value: string;
  onChange: (userId: string, jobTitleHint: string) => void;
  users: User[];
}) {
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
        {selected ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
              {getInitials(`${selected.firstName} ${selected.lastName}`)}
            </span>
            <span className="truncate">{selected.firstName} {selected.lastName}</span>
            <span className="truncate text-xs text-muted-foreground">{selected.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Link to user account</span>
        )}
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or email..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((u) => {
                const roleName = u.roles?.[0]?.name ?? "";
                return (
                  <CommandItem
                    key={u.id}
                    value={`${u.firstName} ${u.lastName} ${u.email}`}
                    onSelect={() => {
                      onChange(u.id, roleName);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", u.id === value ? "opacity-100" : "opacity-0")} />
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary mr-2">
                      {getInitials(`${u.firstName} ${u.lastName}`)}
                    </span>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm">{u.firstName} {u.lastName}</span>
                      <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                    </div>
                    {roleName && (
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground border rounded px-1">{roleName}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function NewEmployeePage() {
  useRequirePermission(FEATURE_PERMS.employees);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.get<PaginatedResponse<User>>("/users", { limit: 100, isActive: true })
      .then((res) => setUsers(res.items))
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createEmployeeSchema) as any,
    defaultValues: {
      employmentType: "FULL_TIME",
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  function handleUserSelect(userId: string, jobTitleHint: string) {
    setValue("userId", userId);
    // Auto-fill job title from the user's primary role if the field is empty
    if (!watch("jobTitle") && jobTitleHint) {
      setValue("jobTitle", jobTitleHint, { shouldValidate: false });
    }
  }

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
              <UserSearchSelect
                value={watch("userId") || ""}
                onChange={handleUserSelect}
                users={users}
              />
              {errors.userId && <p className="text-xs text-destructive">{errors.userId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Employee Code</Label>
              <Input placeholder="EMP-001" {...register("employeeCode")} />
            </div>
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <JobTitleSelect
                value={watch("jobTitle") || ""}
                onChange={(v) => setValue("jobTitle", v, { shouldValidate: true })}
              />
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
              <DatePickerField
                value={watch("startDate")}
                onChange={(value) => setValue("startDate", value, { shouldValidate: true })}
              />
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
