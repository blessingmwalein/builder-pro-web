"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Send, Check, X } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchQuotes, sendQuote } from "@/store/slices/quotesSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { Quote, QuoteStatus } from "@/types";

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

function normalizeQuote(input: Quote): Quote {
  const raw = input as unknown as Record<string, unknown>;
  const total = toNumber(raw.total ?? raw.totalAmount);
  const subtotal = toNumber(raw.subtotal);
  const taxAmount = toNumber(raw.taxAmount);
  const discountAmount = toNumber(raw.discountAmount);
  const taxRate = toNumber(raw.taxRate);
  const quoteNumber = toString(raw.referenceNumber ?? raw.quoteNumber, "Quote");

  return {
    ...input,
    referenceNumber: quoteNumber,
    subtotal,
    taxAmount,
    total,
    discountAmount,
    taxRate,
    lineItems: (input.lineItems ?? []).map((item) => {
      const itemRaw = item as unknown as Record<string, unknown>;
      const quantity = toNumber(itemRaw.quantity);
      const unitPrice = toNumber(itemRaw.unitPrice);
      const computedTotal = toNumber(itemRaw.total ?? itemRaw.totalPrice, quantity * unitPrice);
      return {
        ...item,
        quantity,
        unitPrice,
        total: computedTotal,
      };
    }),
  };
}

const statuses: { label: string; value: QuoteStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Converted", value: "CONVERTED" },
];

export default function QuotesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items, total, isLoading } = useAppSelector((s) => s.quotes);
  const [filter, setFilter] = useState<QuoteStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (filter !== "ALL") params.status = filter;
    if (search) params.search = search;
    dispatch(fetchQuotes(params));
  }, [dispatch, page, filter, search]);

  const normalizedItems = useMemo(() => items.map(normalizeQuote), [items]);

  const columns: Column<Quote>[] = [
    {
      key: "ref",
      header: "Reference",
      cell: (q) => (
        <div>
          <p className="text-sm font-semibold">{q.referenceNumber}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{q.title}</p>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (q) => <span className="text-sm">{q.client?.name || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (q) => <StatusBadge status={q.status} />,
    },
    {
      key: "total",
      header: "Total",
      cell: (q) => <span className="text-sm font-semibold">{formatCurrency(q.total)}</span>,
      className: "text-right",
    },
    {
      key: "issued",
      header: "Issued",
      cell: (q) => (
        <span className="text-sm text-muted-foreground">
          {new Date(q.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (q) => (
        <div className="flex gap-1">
          {q.status === "DRAFT" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(sendQuote(q.id));
              }}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Quotes" description="Create and manage project quotes for your clients.">
        <Button onClick={() => router.push("/quotes/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v: string | null) => { setFilter(v as QuoteStatus | "ALL"); setPage(1); }}>
          <TabsList>
            {statuses.map((s) => (
              <TabsTrigger key={s.value} value={s.value} className="text-xs">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search quotes..."
          className="max-w-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Create your first quote to start billing clients."
          actionLabel="Create Quote"
          onAction={() => router.push("/quotes/new")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={normalizedItems}
          isLoading={isLoading}
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
          onRowClick={(q) => router.push(`/quotes/${q.id}`)}
        />
      )}
    </div>
  );
}
