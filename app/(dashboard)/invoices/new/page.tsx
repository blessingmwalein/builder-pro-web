"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { createInvoice } from "@/store/slices/invoicesSlice";
import { fetchQuotes } from "@/store/slices/quotesSlice";
import { fetchClients } from "@/store/slices/crmSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { fetchSuppliers } from "@/store/slices/materialsSlice";
import { createInvoiceSchema, type CreateInvoiceFormData } from "@/lib/validations";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePickerField } from "@/components/shared/date-picker-field";
import { searchElectrosalesProducts, type ElectrosalesProduct } from "@/lib/electrosales";
import type { Quote } from "@/types";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { clients } = useAppSelector((s) => s.crm);
  const { items: projects } = useAppSelector((s) => s.projects);
  const { suppliers } = useAppSelector((s) => s.materials);
  const { items: quotes } = useAppSelector((s) => s.quotes);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [didPrefillFromQuote, setDidPrefillFromQuote] = useState(false);
  const [productQueries, setProductQueries] = useState<Record<number, string>>({});
  const [productResults, setProductResults] = useState<Record<number, ElectrosalesProduct[]>>({});
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchClients({ limit: 100 }));
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchSuppliers({ limit: 200 }));
    dispatch(fetchQuotes({ page: 1, limit: 200 }));
  }, [dispatch]);

  const eligibleQuotes = useMemo(
    () => quotes.filter((quote) => quote.status === "APPROVED" || quote.status === "CONVERTED"),
    [quotes],
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedSupplierId),
    [selectedSupplierId, suppliers],
  );

  const quoteFromQuery = searchParams.get("quoteId") || "";

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

  const { fields, append, remove, replace } = useFieldArray({ control, name: "lineItems" });
  const lineItems = watch("lineItems");
  const subtotal = lineItems.reduce((s, item) => s + (item.quantity || 0) * (item.unitPrice || 0), 0);

  useEffect(() => {
    if (!quoteFromQuery || didPrefillFromQuote || eligibleQuotes.length === 0) return;
    const targetQuote = eligibleQuotes.find((quote) => quote.id === quoteFromQuery);
    if (!targetQuote) return;

    setSelectedQuoteId(targetQuote.id);
    setValue("quoteId", targetQuote.id);
    setValue("clientId", targetQuote.clientId, { shouldValidate: true });
    setValue("projectId", targetQuote.projectId || "");
    setValue("notes", targetQuote.notes || "");
    setValue("paymentTerms", targetQuote.paymentTerms || "");
    replace(
      targetQuote.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    );
    setDidPrefillFromQuote(true);
  }, [didPrefillFromQuote, eligibleQuotes, quoteFromQuery, replace, setValue]);

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
    setProductQueries((current) => ({ ...current, [index]: product.name }));
    setProductResults((current) => ({ ...current, [index]: [] }));
  }

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
              <Select
                value={watch("clientId") || undefined}
                onValueChange={(v: string | null) => setValue("clientId", v ?? "", { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={watch("projectId") || undefined}
                onValueChange={(v: string | null) => setValue("projectId", v ?? "") }
              >
                <SelectTrigger><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Quote (optional)</Label>
              <Select
                value={selectedQuoteId || undefined}
                onValueChange={(value: string | null) => {
                  const quoteId = value ?? "";
                  setSelectedQuoteId(quoteId);
                  setValue("quoteId", quoteId || undefined);

                  const selectedQuote = eligibleQuotes.find((quote) => quote.id === quoteId);
                  if (!selectedQuote) return;

                  setValue("clientId", selectedQuote.clientId, { shouldValidate: true });
                  setValue("projectId", selectedQuote.projectId || "");
                  setValue("notes", selectedQuote.notes || "");
                  setValue("paymentTerms", selectedQuote.paymentTerms || "");
                  replace(
                    selectedQuote.lineItems.map((item) => ({
                      description: item.description,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                    })),
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick approved/converted quote for auto-prefill" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleQuotes.map((quote: Quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.referenceNumber} | {quote.client?.name || "Client"} | {formatCurrency(quote.total)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <DatePickerField
                value={watch("issueDate")}
                onChange={(value) => setValue("issueDate", value, { shouldValidate: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <DatePickerField
                value={watch("dueDate")}
                onChange={(value) => setValue("dueDate", value, { shouldValidate: true })}
              />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Retention %</Label>
              <Input type="number" step="0.1" {...register("retentionPct")} />
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
                <div className="sm:col-span-2 text-right">
                  {index === 0 && <Label className="text-xs">Total</Label>}
                  <p className="h-9 flex items-center justify-end text-sm font-medium">
                    {formatCurrency((lineItems[index]?.quantity || 0) * (lineItems[index]?.unitPrice || 0))}
                  </p>
                </div>
                <div className="sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
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
