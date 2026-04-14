"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { createInvoice } from "@/store/slices/invoicesSlice";
import { fetchClients } from "@/store/slices/crmSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { createInvoiceSchema, type CreateInvoiceFormData } from "@/lib/validations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function NewInvoicePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { clients } = useAppSelector((s) => s.crm);
  const { items: projects } = useAppSelector((s) => s.projects);

  useEffect(() => {
    dispatch(fetchClients({ limit: 100 }));
    dispatch(fetchProjects({ limit: 100 }));
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createInvoiceSchema) as any,
    defaultValues: {
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      retentionPct: 0,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = watch("lineItems");
  const subtotal = lineItems.reduce((s, item) => s + (item.quantity || 0) * (item.unitPrice || 0), 0);

  async function onSubmit(data: CreateInvoiceFormData) {
    try {
      await dispatch(createInvoice(data)).unwrap();
      router.push("/invoices");
    } catch { /* handled by Redux */ }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="New Invoice" description="Create an invoice for your client.">
        <Button variant="outline" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select onValueChange={(v: string | null) => setValue("clientId", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select onValueChange={(v: string | null) => setValue("projectId", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <Input type="date" {...register("issueDate")} />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Retention %</Label>
              <Input type="number" step="0.1" {...register("retentionPct")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 sm:grid-cols-12 items-end">
                <div className="sm:col-span-5">
                  {index === 0 && <Label className="text-xs">Description</Label>}
                  <Input className="h-9 text-sm" placeholder="Description" {...register(`lineItems.${index}.description`)} />
                </div>
                <div className="sm:col-span-2">
                  {index === 0 && <Label className="text-xs">Qty</Label>}
                  <Input className="h-9 text-sm" type="number" step="0.01" {...register(`lineItems.${index}.quantity`)} />
                </div>
                <div className="sm:col-span-2">
                  {index === 0 && <Label className="text-xs">Unit Price</Label>}
                  <Input className="h-9 text-sm" type="number" step="0.01" {...register(`lineItems.${index}.unitPrice`)} />
                </div>
                <div className="sm:col-span-2 text-right">
                  {index === 0 && <Label className="text-xs">Total</Label>}
                  <p className="h-9 flex items-center justify-end text-sm font-medium">
                    {formatCurrency((lineItems[index]?.quantity || 0) * (lineItems[index]?.unitPrice || 0))}
                  </p>
                </div>
                <div className="sm:col-span-1">
                  <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length <= 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Separator className="my-4" />
            <div className="flex justify-end">
              <div className="flex gap-8 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary w-28 text-right">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." {...register("notes")} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea placeholder="e.g. Net 30" {...register("paymentTerms")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/invoices")}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
