"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { createProject } from "@/store/slices/projectsSlice";
import { fetchClients } from "@/store/slices/crmSlice";
import { fetchEmployees } from "@/store/slices/employeesSlice";
import { createProjectSchema, type CreateProjectFormData } from "@/lib/validations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProjectType } from "@/types";

const PROJECT_TYPES: { label: string; value: ProjectType }[] = [
  { label: "Residential", value: "RESIDENTIAL" },
  { label: "Commercial", value: "COMMERCIAL" },
  { label: "Renovation", value: "RENOVATION" },
  { label: "Industrial", value: "INDUSTRIAL" },
  { label: "Infrastructure", value: "INFRASTRUCTURE" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { clients } = useAppSelector((s) => s.crm);
  const { items: employees } = useAppSelector((s) => s.employees);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createProjectSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      projectType: "RESIDENTIAL",
      siteAddress: "",
      clientId: "",
      projectManagerId: "",
      startDate: "",
      endDate: "",
      baselineBudget: 0,
    },
  });

  useEffect(() => {
    dispatch(fetchClients({ limit: 100 }));
    dispatch(fetchEmployees({ limit: 100 }));
  }, [dispatch]);

  const onSubmit = async (data: CreateProjectFormData) => {
    try {
      // Clean optional empty strings before sending
      const payload = {
        ...data,
        clientId: data.clientId || undefined,
        projectManagerId: data.projectManagerId || undefined,
        endDate: data.endDate || undefined,
        siteAddress: data.siteAddress || undefined,
        description: data.description || undefined,
        baselineBudget: data.baselineBudget || undefined,
      };

      await dispatch(createProject(payload)).unwrap();
      toast.success("Project created successfully");
      router.push("/projects");
    } catch {
      toast.error("Failed to create project. Please try again.");
    }
  };

  const watchProjectType = watch("projectType");
  const watchClientId = watch("clientId");
  const watchProjectManagerId = watch("projectManagerId");

  return (
    <div className="space-y-6">
      <PageHeader title="New Project" description="Create a new construction project.">
        <Button variant="outline" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Sunrise Heights Phase 2"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the project scope and objectives..."
                  rows={3}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Project Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watchProjectType}
                  onValueChange={(val: string | null) => setValue("projectType", val as ProjectType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectType && (
                  <p className="text-xs text-destructive">{errors.projectType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteAddress">Site Address</Label>
                <Input
                  id="siteAddress"
                  placeholder="e.g. 123 Main Street, Harare"
                  {...register("siteAddress")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* People */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={watchClientId || ""}
                  onValueChange={(val: string | null) => setValue("clientId", val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project Manager</Label>
                <Select
                  value={watchProjectManagerId || ""}
                  onValueChange={(val: string | null) => setValue("projectManagerId", val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.userId}>
                        {emp.user?.firstName} {emp.user?.lastName} - {emp.jobTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Schedule & Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule & Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input id="startDate" type="date" {...register("startDate")} />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baselineBudget">Baseline Budget</Label>
                <Input
                  id="baselineBudget"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("baselineBudget")}
                />
                {errors.baselineBudget && (
                  <p className="text-xs text-destructive">{errors.baselineBudget.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
}
