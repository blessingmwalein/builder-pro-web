"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { createClient } from "@/store/slices/crmSlice";
import { createClientSchema, type CreateClientFormData } from "@/lib/validations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewClientPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { clientType: "COMMERCIAL" },
  });

  async function onSubmit(data: CreateClientFormData) {
    try {
      await dispatch(createClient(data)).unwrap();
      router.push("/crm");
    } catch { /* handled by Redux */ }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Add Client" description="Create a new client record.">
        <Button variant="outline" onClick={() => router.push("/crm")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Client Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Client Name *</Label>
              <Input placeholder="e.g. Delta Properties Ltd" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input placeholder="Full name" {...register("contactPerson")} />
            </div>
            <div className="space-y-2">
              <Label>Client Type *</Label>
              <Select defaultValue="COMMERCIAL" onValueChange={(v: string | null) => setValue("clientType", v as "RESIDENTIAL" | "COMMERCIAL" | "GOVERNMENT" | "OTHER")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                  <SelectItem value="GOVERNMENT">Government</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="client@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+263 77 xxx xxxx" {...register("phone")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input placeholder="Physical address" {...register("address")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any additional notes..." {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/crm")}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Client
          </Button>
        </div>
      </form>
    </div>
  );
}
