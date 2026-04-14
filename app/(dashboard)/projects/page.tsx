"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  PauseCircle,
  DollarSign,
} from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project, ProjectStatus } from "@/types";

const PAGE_SIZE = 10;

const STATUS_TABS: { label: string; value: ProjectStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "On Hold", value: "ON_HOLD" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Draft", value: "DRAFT" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { items: projects, total, isLoading } = useAppSelector((s) => s.projects);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch projects when filters change
  useEffect(() => {
    const params: Record<string, string | number> = {
      page,
      limit: PAGE_SIZE,
    };
    if (statusFilter !== "ALL") params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    dispatch(fetchProjects(params));
  }, [dispatch, page, statusFilter, debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats derived from all loaded projects (could also be separate endpoint)
  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === "ACTIVE").length;
    const completed = projects.filter((p) => p.status === "COMPLETED").length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.baselineBudget || 0), 0);
    return { total, active, completed, totalBudget };
  }, [projects, total]);

  const columns: Column<Project>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Project",
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.code}</p>
          </div>
        ),
      },
      {
        key: "client",
        header: "Client",
        cell: (row) => (
          <span className="text-sm">
            {row.client?.name || <span className="text-muted-foreground">--</span>}
          </span>
        ),
        className: "hidden md:table-cell",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "progress",
        header: "Progress",
        cell: (row) => (
          <div className="flex items-center gap-3 min-w-[120px]">
            <Progress value={row.completionPercent} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
              {row.completionPercent}%
            </span>
          </div>
        ),
        className: "hidden lg:table-cell",
      },
      {
        key: "budget",
        header: "Budget",
        cell: (row) => (
          <span className="text-sm tabular-nums">
            {row.baselineBudget ? formatCurrency(row.baselineBudget) : "--"}
          </span>
        ),
        className: "hidden md:table-cell",
      },
      {
        key: "dates",
        header: "Dates",
        cell: (row) => {
          const fmt = (d: string) =>
            new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
          return (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              <span>{fmt(row.startDate)}</span>
              {row.endDate && <span> - {fmt(row.endDate)}</span>}
            </div>
          );
        },
        className: "hidden xl:table-cell",
      },
    ],
    [formatCurrency]
  );

  const handleTabChange = (value: string | number | null) => {
    if (value !== null) {
      setStatusFilter(value as ProjectStatus | "ALL");
      setPage(1);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Manage and track all your construction projects.">
        <Button onClick={() => router.push("/projects/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Projects"
          value={stats.total}
          icon={FolderKanban}
        />
        <StatsCard
          title="Active"
          value={stats.active}
          icon={PauseCircle}
          iconColor="bg-emerald-500"
        />
        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          iconColor="bg-blue-500"
        />
        <StatsCard
          title="Total Budget"
          value={formatCurrency(stats.totalBudget)}
          icon={DollarSign}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs defaultValue="ALL" value={statusFilter} onValueChange={handleTabChange}>
          <TabsList variant="line">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {!isLoading && projects.length === 0 && !debouncedSearch && statusFilter === "ALL" ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start tracking budgets, tasks, and timelines."
          actionLabel="New Project"
          onAction={() => router.push("/projects/new")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={projects}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/projects/${row.id}`)}
          emptyMessage="No projects match your filters."
        />
      )}
    </div>
  );
}
