"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown, Check, Search, Package } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { useRequirePermission } from "@/lib/use-require-permission";
import { FEATURE_PERMS } from "@/lib/permissions";
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
import { Separator } from "@/components/ui/separator";
import { DatePickerField } from "@/components/shared/date-picker-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { searchElectrosalesProducts, type ElectrosalesProduct } from "@/lib/electrosales";
import type { Quote } from "@/types";

// ─── SearchableSelect ────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

type SelectOption = { value: string; label: string; sublabel?: string };

function SearchableSelect({
  value, onChange, options, placeholder = "Search...", emptyText = "No results",
  showAvatar = false, disabled = false,
}: {
  value: string; onChange: (v: string) => void; options: SelectOption[];
  placeholder?: string; emptyText?: string; showAvatar?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          <div className="flex items-center gap-2 overflow-hidden">
            {showAvatar && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                {getInitials(selected.label)}
              </span>
            )}
            <span className="truncate">{selected.label}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", opt.value === value ? "opacity-100" : "opacity-0")} />
                  {showAvatar && (
                    <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {getInitials(opt.label)}
                    </span>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm">{opt.label}</span>
                    {opt.sublabel && <span className="text-xs text-muted-foreground truncate">{opt.sublabel}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Product Search Popover ───────────────────────────────────────────────────

function ProductSearchPopover({
  filterSupplierName, chosen, onSelect, formatCurrency,
}: {
  filterSupplierName?: string; chosen?: ElectrosalesProduct;
  onSelect: (p: ElectrosalesProduct) => void;
  formatCurrency: (n: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ElectrosalesProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const items = await searchElectrosalesProducts(q, 8);
      setResults(filterSupplierName
        ? items.filter((r) => r.supplierName.toLowerCase().includes(filterSupplierName.toLowerCase()))
        : items);
    } finally {
      setLoading(false);
    }
  }, [filterSupplierName]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-8 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
        <Search className="h-3 w-3 shrink-0" />
        <span className="truncate">{chosen?.name || "Search Electrosales..."}</span>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Product name or SKU..." value={query} onValueChange={(q) => void search(q)} />
          <CommandList className="max-h-72">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching...
              </div>
            )}
            {!loading && query.length >= 2 && results.length === 0 && <CommandEmpty>No products found.</CommandEmpty>}
            <CommandGroup>
              {results.map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => { onSelect(product); setOpen(false); }}
                  className="flex items-start gap-3 py-2"
                >
                  {/* Thumbnail */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="font-medium leading-tight">{product.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-primary">{formatCurrency(product.price)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      <span>excl. VAT: {formatCurrency(product.priceExclVat)}</span>
                      <span className={cn("font-medium", product.availability === "In Stock" ? "text-green-600" : "text-amber-500")}>
                        {product.availability}
                      </span>
                      <span>{product.supplierName}</span>
                    </div>
                    {product.breadcrumbs.length > 0 && (
                      <span className="text-[11px] text-muted-foreground/70">{product.breadcrumbs.join(" › ")}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Quote Search Popover ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  CONVERTED: "bg-blue-100 text-blue-800",
  SENT: "bg-yellow-100 text-yellow-800",
  DRAFT: "bg-gray-100 text-gray-600",
};

function quoteNum(q: Quote): string {
  return (q as unknown as Record<string, unknown>).quoteNumber as string
    || q.referenceNumber
    || q.id.slice(0, 8).toUpperCase();
}

function quoteTotal(q: Quote): number {
  return Number((q as unknown as Record<string, unknown>).totalAmount ?? q.total ?? 0);
}

function QuoteSearchPopover({
  value,
  quotes,
  onSelect,
  formatCurrency,
}: {
  value: string;
  quotes: Quote[];
  onSelect: (q: Quote) => void;
  formatCurrency: (n: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = quotes.find((q) => q.id === value);

  const filtered = query.trim().length === 0
    ? quotes
    : quotes.filter((q) => {
        const num = quoteNum(q).toLowerCase();
        const client = (q.client?.name || "").toLowerCase();
        const project = (q.project?.name || "").toLowerCase();
        const qry = query.toLowerCase();
        return num.includes(qry) || client.includes(qry) || project.includes(qry);
      });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
        {selected ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-medium truncate">{quoteNum(selected)}</span>
            {selected.client?.name && (
              <span className="text-muted-foreground text-xs truncate">— {selected.client.name}</span>
            )}
            <span className="ml-auto shrink-0 text-xs font-semibold text-primary">
              {formatCurrency(quoteTotal(selected))}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Search approved quotes…</span>
        )}
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by quote number, client, or project…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            {filtered.length === 0 && <CommandEmpty>No quotes found.</CommandEmpty>}
            <CommandGroup>
              {filtered.map((q) => {
                const statusColor = STATUS_COLORS[q.status] ?? "bg-gray-100 text-gray-600";
                const expiry = q.expiryDate
                  ? new Date(q.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : null;
                const issued = q.issueDate
                  ? new Date(q.issueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : null;
                return (
                  <CommandItem
                    key={q.id}
                    value={q.id}
                    onSelect={() => { onSelect(q); setOpen(false); setQuery(""); }}
                    className="flex-col items-start gap-1 py-2.5"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Check className={cn("h-3.5 w-3.5 shrink-0", q.id === value ? "opacity-100" : "opacity-0")} />
                        <span className="font-semibold text-sm">{quoteNum(q)}</span>
                        {q.title && <span className="text-xs text-muted-foreground truncate">{q.title}</span>}
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {formatCurrency(quoteTotal(q))}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-5.5 text-xs text-muted-foreground">
                      {q.client?.name && <span className="font-medium text-foreground/80">{q.client.name}</span>}
                      {q.project?.name && <span>{q.project.name}</span>}
                      <span className={cn("rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-wide", statusColor)}>
                        {q.status}
                      </span>
                      {issued && <span>Issued {issued}</span>}
                      {expiry && <span>Expires {expiry}</span>}
                    </div>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  useRequirePermission(FEATURE_PERMS.invoicesCreate);
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { clients } = useAppSelector((s) => s.crm);
  const { items: projects } = useAppSelector((s) => s.projects);
  const { suppliers } = useAppSelector((s) => s.materials);
  const { items: quotes } = useAppSelector((s) => s.quotes);

  const [lineItemSuppliers, setLineItemSuppliers] = useState<Record<number, string>>({});
  const [chosenProducts, setChosenProducts] = useState<Record<number, ElectrosalesProduct>>({});
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [didPrefill, setDidPrefill] = useState(false);

  const {
    register, handleSubmit, control, setValue, watch,
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

  const eligibleQuotes = useMemo(
    () => quotes.filter((q) => q.status === "APPROVED" || q.status === "CONVERTED"),
    [quotes],
  );

  useEffect(() => {
    dispatch(fetchClients({ limit: 100 }));
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchSuppliers({ limit: 200 }));
    dispatch(fetchQuotes({ page: 1, limit: 200 }));
  }, [dispatch]);

  // Pre-populate from ?projectId= URL param
  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) setValue("projectId", pid);
  }, [searchParams, setValue]);

  // Pre-populate from ?quoteId= URL param
  useEffect(() => {
    const qid = searchParams.get("quoteId");
    if (!qid || didPrefill || eligibleQuotes.length === 0) return;
    const q = eligibleQuotes.find((x) => x.id === qid);
    if (!q) return;
    prefillFromQuote(q);
    setDidPrefill(true);
  }, [searchParams, eligibleQuotes, didPrefill]); // eslint-disable-line react-hooks/exhaustive-deps

  function prefillFromQuote(q: Quote) {
    setSelectedQuoteId(q.id);
    setValue("quoteId", q.id);
    setValue("clientId", q.clientId, { shouldValidate: true });
    setValue("projectId", q.projectId || "");
    setValue("notes", q.notes || "");
    setValue("paymentTerms", q.paymentTerms || "");
    replace(
      (q.lineItems ?? []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    );
  }

  const reindex = <T,>(rec: Record<number, T>, removed: number): Record<number, T> => {
    const next: Record<number, T> = {};
    Object.entries(rec).forEach(([k, v]) => {
      const ki = Number(k);
      if (ki < removed) next[ki] = v;
      else if (ki > removed) next[ki - 1] = v;
    });
    return next;
  };

  function applyProduct(index: number, product: ElectrosalesProduct) {
    setValue(`lineItems.${index}.description`, `${product.name}${product.sku ? ` (${product.sku})` : ""}`, { shouldValidate: true });
    setValue(`lineItems.${index}.unitPrice`, product.price, { shouldValidate: true });
    setChosenProducts((prev) => ({ ...prev, [index]: product }));
    const matched = suppliers.find(
      (s) => s.name.toLowerCase().includes(product.supplierName.toLowerCase()) ||
             product.supplierName.toLowerCase().includes(s.name.toLowerCase()),
    );
    if (matched) setLineItemSuppliers((prev) => ({ ...prev, [index]: matched.id }));
  }

  function removeLineItem(index: number) {
    if (fields.length <= 1) return;
    remove(index);
    setLineItemSuppliers((prev) => reindex(prev, index));
    setChosenProducts((prev) => reindex(prev, index));
  }

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name, sublabel: c.email || c.phone || "" }));
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name, sublabel: p.status }));
  const supplierOptions = [
    { value: "", label: "Any supplier", sublabel: "" },
    ...suppliers.map((s) => ({ value: s.id, label: s.name, sublabel: s.phone || s.email || "" })),
  ];

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
        {/* Invoice Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Client *</Label>
                <SearchableSelect
                  value={watch("clientId") || ""}
                  onChange={(v) => setValue("clientId", v, { shouldValidate: true })}
                  options={clientOptions}
                  placeholder="Search clients..."
                  emptyText="No clients found"
                  showAvatar
                />
                {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <SearchableSelect
                  value={watch("projectId") || ""}
                  onChange={(v) => setValue("projectId", v)}
                  options={projectOptions}
                  placeholder="Link to project..."
                  emptyText="No projects found"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quote (optional — auto-fills line items)</Label>
              <QuoteSearchPopover
                value={selectedQuoteId}
                quotes={eligibleQuotes}
                onSelect={prefillFromQuote}
                formatCurrency={formatCurrency}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <DatePickerField
                  value={watch("issueDate")}
                  onChange={(v) => setValue("issueDate", v, { shouldValidate: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <DatePickerField
                  value={watch("dueDate")}
                  onChange={(v) => setValue("dueDate", v, { shouldValidate: true })}
                />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Retention %</Label>
                <Input type="number" step="0.1" min="0" max="100" {...register("retentionPct")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-0 text-xs text-muted-foreground font-medium">
              <div className="sm:col-span-6">Description</div>
              <div className="sm:col-span-2 text-right">Qty</div>
              <div className="sm:col-span-2 text-right">Unit Price</div>
              <div className="sm:col-span-1 text-right">Total</div>
              <div className="sm:col-span-1" />
            </div>

            {fields.map((field, index) => {
              const supplierName = lineItemSuppliers[index]
                ? suppliers.find((s) => s.id === lineItemSuppliers[index])?.name
                : undefined;
              return (
                <div key={field.id} className="grid gap-2 sm:grid-cols-12 items-start">
                  {/* Description + supplier + product search */}
                  <div className="sm:col-span-6 space-y-1.5">
                    <Input
                      className="h-9 text-sm"
                      placeholder="Description"
                      {...register(`lineItems.${index}.description`)}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <SearchableSelect
                        value={lineItemSuppliers[index] || ""}
                        onChange={(v) => setLineItemSuppliers((prev) => ({ ...prev, [index]: v }))}
                        options={supplierOptions}
                        placeholder="Supplier..."
                        emptyText="No suppliers"
                      />
                      <ProductSearchPopover
                        filterSupplierName={supplierName}
                        chosen={chosenProducts[index]}
                        onSelect={(p) => applyProduct(index, p)}
                        formatCurrency={formatCurrency}
                      />
                    </div>
                  </div>

                  {/* Qty */}
                  <div className="sm:col-span-2">
                    <Input
                      className="h-9 text-sm text-right"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`lineItems.${index}.quantity`)}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="sm:col-span-2">
                    <Input
                      className="h-9 text-sm text-right"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`lineItems.${index}.unitPrice`)}
                    />
                  </div>

                  {/* Row total */}
                  <div className="sm:col-span-1 flex items-center justify-end h-9">
                    <p className="text-sm font-medium">
                      {formatCurrency((lineItems[index]?.quantity || 0) * (lineItems[index]?.unitPrice || 0))}
                    </p>
                  </div>

                  {/* Delete */}
                  <div className="sm:col-span-1 flex items-center justify-end h-9">
                    <Button
                      type="button" variant="ghost" size="sm" className="h-9 w-9 p-0"
                      onClick={() => removeLineItem(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Separator className="my-4" />
            <div className="flex justify-end">
              <div className="flex gap-8 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary w-28 text-right">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes + Payment Terms */}
        <Card>
          <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." rows={3} {...register("notes")} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea placeholder="e.g. Net 30" rows={3} {...register("paymentTerms")} />
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
