"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchInvoices } from "@/store/slices/invoicesSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatsCard } from "@/components/shared/stats-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DollarSign, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { Invoice, InvoiceStatus } from "@/types";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeInvoice(input: Invoice): Invoice {
  const raw = input as unknown as Record<string, unknown>;
  const total = toNumber(raw.total ?? raw.totalAmount);
  const amountPaid = toNumber(raw.amountPaid ?? raw.paidAmount);
  const balanceDue = toNumber(raw.balanceDue ?? raw.balanceAmount, total - amountPaid);
  const taxAmount = toNumber(raw.taxAmount);
  const subtotal = toNumber(raw.subtotal);
  const retentionPct = toNumber(raw.retentionPct);
  const invoiceNumber = toString(raw.invoiceNumber, "Invoice");

  return {
    ...input,
    invoiceNumber,
    subtotal,
    taxAmount,
    total,
    amountPaid,
    balanceDue,
    retentionPct,
    lineItems: (input.lineItems ?? []).map((item) => {
      const itemRaw = item as unknown as Record<string, unknown>;
      const quantity = toNumber(itemRaw.quantity);
      const unitPrice = toNumber(itemRaw.unitPrice);
      const totalPrice = toNumber(itemRaw.total ?? itemRaw.totalPrice, quantity * unitPrice);
      return {
        ...item,
        quantity,
        unitPrice,
        total: totalPrice,
      };
    }),
  };
}

const statuses: { label: string; value: InvoiceStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
  { label: "Partial", value: "PARTIALLY_PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

export default function InvoicesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items, total, isLoading } = useAppSelector((s) => s.invoices);
  const [filter, setFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (filter !== "ALL") params.status = filter;
    if (search) params.search = search;
    dispatch(fetchInvoices(params));
  }, [dispatch, page, filter, search]);

  const normalizedItems = useMemo(() => items.map(normalizeInvoice), [items]);

  const totalAmount = normalizedItems.reduce((s, i) => s + i.total, 0);
  const paidAmount = normalizedItems.reduce((s, i) => s + i.amountPaid, 0);
  const overdueAmount = normalizedItems.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.balanceDue, 0);
  const outstandingAmount = normalizedItems.filter((i) => ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(i.status)).reduce((s, i) => s + i.balanceDue, 0);

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Invoice #",
      cell: (inv) => (
        <div>
          <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">{inv.client?.name || "—"}</p>
        </div>
      ),
    },
    { key: "project", header: "Project", cell: (inv) => <span className="text-sm">{inv.project?.name || "—"}</span> },
    { key: "status", header: "Status", cell: (inv) => <StatusBadge status={inv.status} /> },
    {
      key: "total",
      header: "Total",
      cell: (inv) => <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>,
      className: "text-right",
    },
    {
      key: "paid",
      header: "Paid",
      cell: (inv) => <span className="text-sm text-emerald-600">{formatCurrency(inv.amountPaid)}</span>,
      className: "text-right",
    },
    {
      key: "balance",
      header: "Balance",
      cell: (inv) => (
        <span className={`text-sm font-medium ${inv.balanceDue > 0 ? "text-destructive" : "text-emerald-600"}`}>
          {formatCurrency(inv.balanceDue)}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "due",
      header: "Due Date",
      cell: (inv) => {
        const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== "PAID";
        return (
          <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Manage invoices and track payments.">
        <Button onClick={() => router.push("/invoices/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Invoice
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatsCard title="Total Invoiced" value={formatCurrency(totalAmount)} icon={DollarSign} />
        <StatsCard title="Collected" value={formatCurrency(paidAmount)} icon={CheckCircle} />
        <StatsCard title="Outstanding" value={formatCurrency(outstandingAmount)} icon={Clock} />
        <StatsCard title="Overdue" value={formatCurrency(overdueAmount)} icon={AlertTriangle} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v: string | null) => { setFilter(v as InvoiceStatus | "ALL"); setPage(1); }}>
          <TabsList>
            {statuses.map((s) => (
              <TabsTrigger key={s.value} value={s.value} className="text-xs">{s.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search invoices..."
          className="max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create your first invoice to start tracking payments."
          actionLabel="Create Invoice"
          onAction={() => router.push("/invoices/new")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={normalizedItems}
          isLoading={isLoading}
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
          onRowClick={(inv) => router.push(`/invoices/${inv.id}`)}
        />
      )}
    </div>
  );
}
