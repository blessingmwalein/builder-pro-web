"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { createQuote } from "@/store/slices/quotesSlice";
import { fetchClients } from "@/store/slices/crmSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { createQuoteSchema, type CreateQuoteFormData } from "@/lib/validations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { LineItemCategory } from "@/types";

const categories: LineItemCategory[] = ["Labour", "Materials", "Equipment", "Subcontractors", "Overheads", "Margin"];

export default function NewQuotePage() {
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
  } = useForm<CreateQuoteFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createQuoteSchema) as any,
    defaultValues: {
      issueDate: new Date().toISOString().slice(0, 10),
      taxRate: 15,
      discountAmount: 0,
      lineItems: [{ category: "Labour", description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = watch("lineItems");
  const taxRate = watch("taxRate") || 0;
  const discountAmount = watch("discountAmount") || 0;

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;

  async function onSubmit(data: CreateQuoteFormData) {
    try {
      await dispatch(createQuote(data)).unwrap();
      router.push("/quotes");
    } catch {
      // Error handled by Redux
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="New Quote" description="Create a professional quote for your client.">
        <Button variant="outline" onClick={() => router.push("/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select onValueChange={(v: string | null) => setValue("clientId", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select onValueChange={(v: string | null) => setValue("projectId", v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. Office Block — Phase 1 Quote" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <Input type="date" {...register("issueDate")} />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" {...register("expiryDate")} />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ category: "Labour", description: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 sm:grid-cols-12 items-end">
                <div className="sm:col-span-2">
                  {index === 0 && <Label className="text-xs">Category</Label>}
                  <Select
                    defaultValue={field.category}
                    onValueChange={(v: string | null) => setValue(`lineItems.${index}.category`, v as LineItemCategory)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4">
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
                <div className="sm:col-span-1 text-right">
                  {index === 0 && <Label className="text-xs">Total</Label>}
                  <p className="h-9 flex items-center justify-end text-sm font-medium">
                    {formatCurrency((lineItems[index]?.quantity || 0) * (lineItems[index]?.unitPrice || 0))}
                  </p>
                </div>
                <div className="sm:col-span-1">
                  {index === 0 && <Label className="text-xs opacity-0">Del</Label>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {errors.lineItems && <p className="text-xs text-destructive">{errors.lineItems.message}</p>}

            <Separator className="my-4" />

            {/* Totals */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-8 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium w-28 text-right">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Tax</span>
                <Input type="number" className="h-8 w-16 text-xs" step="0.1" {...register("taxRate")} />
                <span className="text-muted-foreground">%</span>
                <span className="font-medium w-28 text-right">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" className="h-8 w-24 text-xs" step="0.01" {...register("discountAmount")} />
                <span className="font-medium w-28 text-right">-{formatCurrency(discountAmount)}</span>
              </div>
              <Separator className="w-64" />
              <div className="flex items-center gap-8 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold w-28 text-right text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes for the client..." {...register("notes")} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea placeholder="e.g. 50% upfront, 50% on completion" {...register("paymentTerms")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/quotes")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Quote
          </Button>
        </div>
      </form>
    </div>
  );
}
