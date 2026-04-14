"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Download } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchEmployees } from "@/store/slices/employeesSlice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Employee } from "@/types";

export default function EmployeesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items, total, isLoading } = useAppSelector((s) => s.employees);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params: Record<string, string | number | boolean> = { page, limit: 20, isActive: true };
    if (search) params.search = search;
    dispatch(fetchEmployees(params));
  }, [dispatch, page, search]);

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Employee",
      cell: (e) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {e.user ? `${e.user.firstName[0]}${e.user.lastName[0]}` : "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{e.user ? `${e.user.firstName} ${e.user.lastName}` : "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{e.employeeCode}</p>
          </div>
        </div>
      ),
    },
    { key: "title", header: "Job Title", cell: (e) => <span className="text-sm">{e.jobTitle}</span> },
    {
      key: "type",
      header: "Type",
      cell: (e) => <Badge variant="secondary" className="text-xs">{e.employmentType.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "rate",
      header: "Hourly Rate",
      cell: (e) => <span className="text-sm font-semibold">{formatCurrency(e.hourlyRate)}/hr</span>,
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => (
        <Badge variant={e.isActive ? "default" : "secondary"} className="text-xs">
          {e.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "start",
      header: "Start Date",
      cell: (e) => <span className="text-sm text-muted-foreground">{new Date(e.startDate).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage your workforce and payroll information.">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Payroll Export
        </Button>
        <Button onClick={() => router.push("/employees/new")}>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </PageHeader>

      <Input
        placeholder="Search employees..."
        className="max-w-sm"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      {items.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Add employees to start tracking hours and managing your team."
          actionLabel="Add Employee"
          onAction={() => router.push("/employees/new")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
          onRowClick={(e) => router.push(`/employees/${e.id}`)}
        />
      )}
    </div>
  );
}
