"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown, Check, Search } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { DatePickerField } from "@/components/shared/date-picker-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { searchElectrosalesProducts, type ElectrosalesProduct } from "@/lib/electrosales";

const PRESET_CATEGORIES = [
  "Labour", "Materials", "Equipment", "Subcontractors",
  "Overheads", "Margin", "Transport", "Permits", "Miscellaneous",
];

// ─── SearchableSelect ─────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

type SelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

function SearchableSelect({
  value, onChange, options, placeholder = "Search...", emptyText = "No results",
  showAvatar = false, disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyText?: string;
  showAvatar?: boolean;
  disabled?: boolean;
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

// ─── Category Combobox ────────────────────────────────────────────────────────

function CategoryCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = PRESET_CATEGORIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  const showAdd = query.trim().length > 0 && !PRESET_CATEGORIES.some(
    (c) => c.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
        <span className={value ? "" : "text-muted-foreground"}>{value || "Category"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or add..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem key={c} onSelect={() => { onChange(c); setOpen(false); setQuery(""); }}>
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
              {showAdd && (
                <CommandItem onSelect={() => { onChange(query.trim()); setOpen(false); setQuery(""); }}>
                  <Plus className="mr-2 h-3.5 w-3.5 text-primary" />
                  Add &quot;{query.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Product Search Popover ───────────────────────────────────────────────────

function ProductSearchPopover({
  filterSupplierName,
  chosen,
  onSelect,
  formatCurrency,
}: {
  filterSupplierName?: string;
  chosen?: ElectrosalesProduct;
  onSelect: (product: ElectrosalesProduct) => void;
  formatCurrency: (amount: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ElectrosalesProduct[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const items = await searchElectrosalesProducts(q, 8);
      const filtered = filterSupplierName
        ? items.filter((r) => r.supplierName.toLowerCase().includes(filterSupplierName.toLowerCase()))
        : items;
      setResults(filtered);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <Search className="h-3 w-3 shrink-0" />
        <span className="truncate">{chosen?.name || "Search Electrosales..."}</span>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Product name or SKU..."
            value={query}
            onValueChange={(q) => void search(q)}
          />
          <CommandList className="max-h-72">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching...
              </div>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No products found.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => { onSelect(product); setOpen(false); }}
                  className="flex-col items-start gap-1 py-2"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="font-medium leading-tight">{product.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    <span>excl. VAT: {formatCurrency(product.priceExclVat)}</span>
                    <span className={cn(
                      "font-medium",
                      product.availability === "In Stock" ? "text-green-600" : "text-amber-500"
                    )}>
                      {product.availability}
                    </span>
                    <span>{product.supplierName}</span>
                  </div>
                  {product.breadcrumbs.length > 0 && (
                    <span className="text-[11px] text-muted-foreground/70">
                      {product.breadcrumbs.join(" › ")}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function NewQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { clients } = useAppSelector((s) => s.crm);
  const { items: projects } = useAppSelector((s) => s.projects);
  const { suppliers } = useAppSelector((s) => s.materials);

  const [lineItemSuppliers, setLineItemSuppliers] = useState<Record<number, string>>({});
  const [chosenProducts, setChosenProducts] = useState<Record<number, ElectrosalesProduct>>({});

  const {
    register, handleSubmit, control, setValue, watch,
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

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) setValue("projectId", pid);
  }, [searchParams, setValue]);

  useEffect(() => {
    dispatch(fetchClients({ limit: 100 }));
    dispatch(fetchProjects({ limit: 100 }));
    dispatch(fetchSuppliers({ limit: 200 }));
  }, [dispatch]);

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name, sublabel: c.email || c.phone || "" }));
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name, sublabel: p.status }));
  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name, sublabel: s.phone || s.email || "" }));

  function mapProductToCategory(product: ElectrosalesProduct): string {
    const path = product.breadcrumbs.join(" ").toLowerCase();
    if (path.includes("tools") || path.includes("equipment")) return "Equipment";
    if (path.includes("service") || path.includes("labour")) return "Labour";
    return "Materials";
  }

  function applyProduct(index: number, product: ElectrosalesProduct) {
    setValue(`lineItems.${index}.description`, `${product.name}${product.sku ? ` (${product.sku})` : ""}`, { shouldValidate: true });
    setValue(`lineItems.${index}.unitPrice`, product.price, { shouldValidate: true });
    setValue(`lineItems.${index}.category`, mapProductToCategory(product), { shouldValidate: true });
    setChosenProducts((prev) => ({ ...prev, [index]: product }));
    const matched = suppliers.find(
      (s) => s.name.toLowerCase().includes(product.supplierName.toLowerCase()) ||
             product.supplierName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (matched) setLineItemSuppliers((prev) => ({ ...prev, [index]: matched.id }));
  }

  function removeLineItem(index: number) {
    if (fields.length <= 1) return;
    remove(index);
    const reindex = <T,>(rec: Record<number, T>): Record<number, T> => {
      const next: Record<number, T> = {};
      Object.entries(rec).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    };
    setLineItemSuppliers(reindex);
    setChosenProducts(reindex);
  }

  async function onSubmit(data: CreateQuoteFormData) {
    try {
      const payload = {
        ...data,
        lineItems: data.lineItems.map((item, i) => {
          const product = chosenProducts[i];
          if (!product) return item;
          return { ...item, externalSource: "electrosales", externalProductId: String(product.id), externalProduct: product };
        }),
      };
      await dispatch(createQuote(payload as CreateQuoteFormData)).unwrap();
      router.push("/quotes");
    } catch {
      // handled by Redux
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="New Quote" description="Create a professional quote for your client.">
        <Button variant="outline" onClick={() => router.push("/quotes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Quote Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quote Details</CardTitle>
          </CardHeader>
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
                <Label>Project (optional)</Label>
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
              <Label>Title *</Label>
              <Input placeholder="e.g. Office Block — Phase 1 Quote" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border bg-muted/5 p-3 space-y-2">
                {/* Row 1: Category + Qty + Unit Price + Total + Delete */}
                <div className="flex items-end gap-2">
                  <div className="flex-[2] min-w-0">
                    {index === 0 && <Label className="mb-1 block text-xs">Category</Label>}
                    <CategoryCombobox
                      value={watch(`lineItems.${index}.category`) || "Labour"}
                      onChange={(v) => setValue(`lineItems.${index}.category`, v, { shouldValidate: true })}
                    />
                  </div>
                  <div className="w-16">
                    {index === 0 && <Label className="mb-1 block text-xs">Qty</Label>}
                    <Input className="h-9 text-sm" type="number" step="0.01" {...register(`lineItems.${index}.quantity`)} />
                  </div>
                  <div className="w-28">
                    {index === 0 && <Label className="mb-1 block text-xs">Unit Price</Label>}
                    <Input className="h-9 text-sm" type="number" step="0.01" {...register(`lineItems.${index}.unitPrice`)} />
                  </div>
                  <div className="w-24 text-right">
                    {index === 0 && <Label className="mb-1 block text-xs">Total</Label>}
                    <p className="flex h-9 items-center justify-end text-sm font-medium">
                      {formatCurrency((lineItems[index]?.quantity || 0) * (lineItems[index]?.unitPrice || 0))}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLineItem(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Row 2: Description */}
                <Input
                  className="h-9 text-sm"
                  placeholder="Item description"
                  {...register(`lineItems.${index}.description`)}
                />
                {errors.lineItems?.[index]?.description && (
                  <p className="text-xs text-destructive">{errors.lineItems[index]?.description?.message}</p>
                )}

                {/* Row 3: Supplier + Product Search */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      value={lineItemSuppliers[index] || ""}
                      onChange={(v) => setLineItemSuppliers((prev) => ({ ...prev, [index]: v }))}
                      options={supplierOptions}
                      placeholder="Supplier (optional)"
                      emptyText="No suppliers"
                    />
                  </div>
                  <div className="flex-1">
                    <ProductSearchPopover
                      filterSupplierName={
                        lineItemSuppliers[index]
                          ? suppliers.find((s) => s.id === lineItemSuppliers[index])?.name
                          : undefined
                      }
                      chosen={chosenProducts[index]}
                      onSelect={(product) => applyProduct(index, product)}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                </div>
              </div>
            ))}
            {errors.lineItems && typeof errors.lineItems.message === "string" && (
              <p className="text-xs text-destructive">{errors.lineItems.message}</p>
            )}

            <Separator className="my-4" />

            {/* Totals */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-8 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="w-28 text-right font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Tax</span>
                <Input type="number" className="h-8 w-16 text-xs" step="0.1" {...register("taxRate")} />
                <span className="text-muted-foreground">%</span>
                <span className="w-28 text-right font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" className="h-8 w-24 text-xs" step="0.01" {...register("discountAmount")} />
                <span className="w-28 text-right font-medium">-{formatCurrency(discountAmount)}</span>
              </div>
              <Separator className="w-64" />
              <div className="flex items-center gap-8 text-base">
                <span className="font-semibold">Total</span>
                <span className="w-28 text-right font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
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

export default function NewQuotePage() {
  return (
    <Suspense fallback={null}>
      <NewQuoteContent />
    </Suspense>
  );
}
