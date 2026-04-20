"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { createQuote } from "@/store/slices/quotesSlice";
import { fetchClients } from "@/store/slices/crmSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { fetchSuppliers } from "@/store/slices/materialsSlice";
import { createQuoteSchema, type CreateQuoteFormData } from "@/lib/validations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePickerField } from "@/components/shared/date-picker-field";
import type { LineItemCategory } from "@/types";
import { fetchElectrosalesDepartments, searchElectrosalesProducts, type ElectrosalesProduct } from "@/lib/electrosales";

const categories: LineItemCategory[] = ["Labour", "Materials", "Equipment", "Subcontractors", "Overheads", "Margin"];

export default function NewQuotePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { clients } = useAppSelector((s) => s.crm);
  const { items: projects } = useAppSelector((s) => s.projects);
  const { suppliers } = useAppSelector((s) => s.materials);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [productQueries, setProductQueries] = useState<Record<number, string>>({});
  const [productResults, setProductResults] = useState<Record<number, ElectrosalesProduct[]>>({});
  // Parallel map: line-item index -> the Electrosales product chosen for it.
  // Sent alongside the line item on submit so the backend can upsert a Material
  // and (on approval) auto-log usage against the project.
  const [chosenProducts, setChosenProducts] = useState<Record<number, ElectrosalesProduct>>({});
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [departmentLabels, setDepartmentLabels] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchClients({ limit: 100 }));
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchSuppliers({ limit: 200 }));

    void fetchElectrosalesDepartments()
      .then((items) => {
        const labels = items
          .map((item) => item.label || item.name || "")
          .filter((label): label is string => Boolean(label));
        setDepartmentLabels(Array.from(new Set(labels)).slice(0, 8));
      })
      .catch(() => setDepartmentLabels([]));
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
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedSupplierId),
    [selectedSupplierId, suppliers],
  );

  function mapProductToCategory(product: ElectrosalesProduct): LineItemCategory {
    const path = product.breadcrumbs.join(" ").toLowerCase();
    if (path.includes("paint") || path.includes("plumbing") || path.includes("building") || path.includes("electrical")) {
      return "Materials";
    }
    if (path.includes("tools") || path.includes("equipment")) {
      return "Equipment";
    }
    if (path.includes("service") || path.includes("labour")) {
      return "Labour";
    }
    return "Materials";
  }

  async function handleProductSearch(index: number, query: string) {
    setProductQueries((current) => ({ ...current, [index]: query }));
    if (query.trim().length < 2) {
      setProductResults((current) => ({ ...current, [index]: [] }));
      return;
    }

    setSearchingIndex(index);
    try {
      const items = await searchElectrosalesProducts(query, 8);
      const filtered = selectedSupplier
        ? items.filter((item) => item.supplierName.toLowerCase().includes(selectedSupplier.name.toLowerCase()))
        : items;
      setProductResults((current) => ({ ...current, [index]: filtered }));
    } finally {
      setSearchingIndex(null);
    }
  }

  function applyProduct(index: number, product: ElectrosalesProduct) {
    const description = `${product.name}${product.sku ? ` (${product.sku})` : ""}`;
    setValue(`lineItems.${index}.description`, description, { shouldValidate: true });
    setValue(`lineItems.${index}.unitPrice`, product.price, { shouldValidate: true });
    setValue(`lineItems.${index}.category`, mapProductToCategory(product), { shouldValidate: true });
    setProductQueries((current) => ({ ...current, [index]: product.name }));
    setProductResults((current) => ({ ...current, [index]: [] }));
    setChosenProducts((current) => ({ ...current, [index]: product }));
  }

  async function onSubmit(data: CreateQuoteFormData) {
    try {
      // Augment line items with Electrosales product snapshots so the backend
      // can upsert Materials + log usage on approval.
      const payload = {
        ...data,
        lineItems: data.lineItems.map((item, i) => {
          const product = chosenProducts[i];
          if (!product) return item;
          return {
            ...item,
            externalSource: "electrosales",
            externalProductId: String(product.id),
            externalProduct: product,
          };
        }),
      };
      await dispatch(createQuote(payload as CreateQuoteFormData)).unwrap();
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
              <Select
                value={watch("clientId") || undefined}
                onValueChange={(v: string | null) => setValue("clientId", v ?? "", { shouldValidate: true })}
              >
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
              <Select
                value={watch("projectId") || undefined}
                onValueChange={(v: string | null) => setValue("projectId", v ?? "")}
              >
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
              <DatePickerField
                value={watch("issueDate")}
                onChange={(value) => setValue("issueDate", value, { shouldValidate: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <DatePickerField
                value={watch("expiryDate") || undefined}
                onChange={(value) => setValue("expiryDate", value, { shouldValidate: true })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supplier & Product Source</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Supplier (optional)</Label>
              <Select value={selectedSupplierId || undefined} onValueChange={(value: string | null) => setSelectedSupplierId(value ?? "") }>
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-sm">
              <p className="font-medium">Selected Supplier</p>
              <p>{selectedSupplier?.name || "No supplier selected"}</p>
              {selectedSupplier?.phone ? <p className="text-muted-foreground">{selectedSupplier.phone}</p> : null}
              {selectedSupplier?.email ? <p className="text-muted-foreground">{selectedSupplier.email}</p> : null}
            </div>
            {departmentLabels.length > 0 ? (
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                Suggested departments: {departmentLabels.join(" | ")}
              </div>
            ) : null}
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
                  <div className="space-y-2">
                    <Input className="h-9 text-sm" placeholder="Description" {...register(`lineItems.${index}.description`)} />
                    <div className="relative">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Search supplier product"
                        value={productQueries[index] || ""}
                        onChange={(event) => {
                          void handleProductSearch(index, event.target.value);
                        }}
                      />
                      {searchingIndex === index ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">Searching products...</p>
                      ) : null}
                      {productResults[index]?.length ? (
                        <div className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-md border bg-background p-1 shadow-sm">
                          {productResults[index].map((product) => (
                            <button
                              key={`${product.id}`}
                              type="button"
                              className="flex w-full flex-col rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                              onClick={() => applyProduct(index, product)}
                            >
                              <span className="text-xs font-medium">{product.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {product.supplierName} | {product.sku || "No SKU"} | {formatCurrency(product.price)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                    onClick={() => {
                      if (fields.length <= 1) return;
                      remove(index);
                      setProductQueries((current) => {
                        const next = { ...current };
                        delete next[index];
                        return next;
                      });
                      setProductResults((current) => {
                        const next = { ...current };
                        delete next[index];
                        return next;
                      });
                    }}
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
