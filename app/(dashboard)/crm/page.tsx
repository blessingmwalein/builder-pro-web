"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchClients } from "@/store/slices/crmSlice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Client } from "@/types";

export default function CrmPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { clients, total, isLoading } = useAppSelector((s) => s.crm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params: Record<string, string | number> = { page, limit: 20 };
    if (search) params.search = search;
    dispatch(fetchClients(params));
  }, [dispatch, page, search]);

  const columns: Column<Client>[] = [
    {
      key: "name",
      header: "Client",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {c.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.contactPerson || c.email || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (c) => (
        <Badge variant="secondary" className="text-xs">
          {c.clientType}
        </Badge>
      ),
    },
    {
      key: "email",
      header: "Contact",
      cell: (c) => (
        <div className="text-sm">
          <p>{c.email || "—"}</p>
          <p className="text-xs text-muted-foreground">{c.phone || ""}</p>
        </div>
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
      cell: (c) => (
        <span className="text-sm font-semibold">{formatCurrency(c.totalRevenue || 0)}</span>
      ),
      className: "text-right",
    },
    {
      key: "balance",
      header: "Outstanding",
      cell: (c) => (
        <span className={`text-sm font-medium ${(c.outstandingBalance || 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {formatCurrency(c.outstandingBalance || 0)}
        </span>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your client relationships and history.">
        <Button onClick={() => router.push("/crm/new")}>
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </PageHeader>

      <Input
        placeholder="Search clients..."
        className="max-w-sm"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      {clients.length === 0 && !isLoading ? (
        <EmptyState
          icon={UserCircle}
          title="No clients yet"
          description="Add your first client to start building relationships."
          actionLabel="Add Client"
          onAction={() => router.push("/crm/new")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={clients}
          isLoading={isLoading}
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
          onRowClick={(c) => router.push(`/crm/${c.id}`)}
        />
      )}
    </div>
  );
}
