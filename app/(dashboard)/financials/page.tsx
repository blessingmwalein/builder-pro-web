"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, DollarSign, Receipt, FolderKanban, BarChart3, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import {
  fetchFinancialDashboard,
  fetchFinancialSummary,
  fetchBudgetCategories,
  createBudgetCategory,
  fetchProjectBudget,
  updateProjectBudget,
  fetchProjectTransactions,
  createTransaction,
} from "@/store/slices/financialsSlice";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerField } from "@/components/shared/date-picker-field";

type BudgetDraftLine = {
  categoryId: string;
  categoryName: string;
  plannedAmount: number;
  thresholdPct: number;
  actualAmount?: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const TRANSACTIONS_PAGE_SIZE = 10;

const TRANSACTION_SOURCE_TYPES = [
  "MANUAL",
  "EQUIPMENT",
  "OVERHEAD",
  "MATERIAL",
  "LABOUR",
  "TRANSPORT",
  "OTHER",
] as const;

export default function FinancialsPage() {
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();

  const { dashboard, summary, categories, projectBudget, transactions, transactionsTotal, isLoading } = useAppSelector(
    (s) => s.financials
  );
  const { items: projects } = useAppSelector((s) => s.projects);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [budgetDraft, setBudgetDraft] = useState<BudgetDraftLine[]>([]);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");

  const [budgetLineDialogOpen, setBudgetLineDialogOpen] = useState(false);
  const [newBudgetCategoryId, setNewBudgetCategoryId] = useState("ALL");
  const [newBudgetPlannedAmount, setNewBudgetPlannedAmount] = useState("");
  const [newBudgetThresholdPct, setNewBudgetThresholdPct] = useState("90");

  const [txnDialogOpen, setTxnDialogOpen] = useState(false);
  const [txnProjectId, setTxnProjectId] = useState<string>("ALL");
  const [txnCategoryId, setTxnCategoryId] = useState<string>("ALL");
  const [txnDescription, setTxnDescription] = useState("");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txnReference, setTxnReference] = useState("");
  const [txnSourceType, setTxnSourceType] = useState("MANUAL");
  const [transactionsPage, setTransactionsPage] = useState(1);

  useEffect(() => {
    dispatch(fetchFinancialDashboard());
    dispatch(fetchBudgetCategories());
    dispatch(fetchProjects({ page: 1, limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (!projects.length) return;
    if (selectedProjectId === "ALL") {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId || selectedProjectId === "ALL") return;

    dispatch(fetchFinancialSummary(selectedProjectId));
    dispatch(fetchProjectBudget(selectedProjectId));
    dispatch(fetchProjectTransactions({ projectId: selectedProjectId, page: transactionsPage, limit: TRANSACTIONS_PAGE_SIZE }));
  }, [dispatch, selectedProjectId, transactionsPage]);

  useEffect(() => {
    setTransactionsPage(1);
  }, [selectedProjectId]);

  useEffect(() => {
    setTxnProjectId((current) => {
      if (current !== "ALL") return current;
      if (selectedProjectId !== "ALL") return selectedProjectId;
      return projects[0]?.id ?? "ALL";
    });
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!projectBudget?.lines) {
      setBudgetDraft([]);
      return;
    }

    const lines = projectBudget.lines.map((line) => ({
      categoryId: line.categoryId,
      categoryName: line.categoryName,
      plannedAmount: toNumber(line.plannedAmount),
      thresholdPct: toNumber(line.thresholdPct),
      actualAmount: toNumber(line.actualAmount),
    }));
    setBudgetDraft(lines);
  }, [projectBudget]);

  const normalizedDashboard = useMemo(() => {
    const raw = asRecord(dashboard);
    const revenue = asRecord(raw.revenue);
    return {
      totalBilled: toNumber(revenue.totalBilled ?? raw.totalRevenue),
      totalCollected: toNumber(revenue.totalCollected),
      totalOutstanding: toNumber(revenue.totalOutstanding ?? raw.outstandingInvoices),
      monthlyBilled: toNumber(revenue.monthlyBilled),
      monthlyCollected: toNumber(revenue.monthlyCollected),
      activeProjects: toNumber(raw.activeProjects),
      budgetAlerts: asArray(raw.budgetAlerts),
      recentInvoices: asArray(raw.recentInvoices),
      cashFlow: asArray(raw.cashFlow),
      projectProfitability: asArray(raw.projectProfitability),
    };
  }, [dashboard]);

  const normalizedSummary = useMemo(() => {
    const raw = asRecord(summary);
    return {
      totalRevenue: toNumber(raw.totalRevenue),
      totalCosts: toNumber(raw.totalCosts),
      netProfit: toNumber(raw.netProfit ?? raw.totalProfit),
      margin: toNumber(raw.profitMargin),
      spent: toNumber(raw.totalSpent),
      budget: toNumber(raw.totalBudget),
      remaining: toNumber(raw.remaining),
    };
  }, [summary]);

  const selectedProjectName = useMemo(
    () => projects.find((p) => p.id === selectedProjectId)?.name ?? "No project selected",
    [projects, selectedProjectId]
  );

  const availableBudgetCategories = useMemo(
    () => categories.filter((category) => !budgetDraft.some((line) => line.categoryId === category.id)),
    [categories, budgetDraft]
  );

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    const code = newCategoryCode.trim().toUpperCase();
    if (!name || !code) return;

    await dispatch(createBudgetCategory({ name, code })).unwrap();
    setCategoryDialogOpen(false);
    setNewCategoryName("");
    setNewCategoryCode("");
  };

  const handleOpenBudgetLineDialog = () => {
    if (availableBudgetCategories.length === 0) return;
    setNewBudgetCategoryId(availableBudgetCategories[0].id);
    setNewBudgetPlannedAmount("");
    setNewBudgetThresholdPct("90");
    setBudgetLineDialogOpen(true);
  };

  const handleCreateBudgetLine = () => {
    if (!newBudgetCategoryId || newBudgetCategoryId === "ALL") return;
    if (budgetDraft.some((line) => line.categoryId === newBudgetCategoryId)) return;

    const selectedCategory = categories.find((category) => category.id === newBudgetCategoryId);
    if (!selectedCategory) return;

    const plannedAmount = Math.max(0, toNumber(newBudgetPlannedAmount));
    const thresholdPct = Math.max(1, Math.min(100, toNumber(newBudgetThresholdPct)));

    setBudgetDraft((prev) => [
      ...prev,
      {
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.name,
        plannedAmount,
        thresholdPct,
        actualAmount: 0,
      },
    ]);

    setBudgetLineDialogOpen(false);
    setNewBudgetCategoryId("ALL");
    setNewBudgetPlannedAmount("");
    setNewBudgetThresholdPct("90");
  };

  const handleBudgetLineChange = (index: number, patch: Partial<BudgetDraftLine>) => {
    setBudgetDraft((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const handleRemoveBudgetLine = (index: number) => {
    setBudgetDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBudget = async () => {
    if (!selectedProjectId || selectedProjectId === "ALL") return;

    await dispatch(
      updateProjectBudget({
        projectId: selectedProjectId,
        lines: budgetDraft.map((line) => ({
          categoryId: line.categoryId,
          plannedAmount: Math.max(0, toNumber(line.plannedAmount)),
          thresholdPct: Math.max(1, Math.min(100, toNumber(line.thresholdPct))),
        })),
      })
    ).unwrap();

    dispatch(fetchProjectBudget(selectedProjectId));
  };

  const handleCreateTransaction = async () => {
    if (!txnProjectId || txnProjectId === "ALL" || !txnCategoryId || txnCategoryId === "ALL") return;
    if (!txnDescription.trim()) return;

    await dispatch(
      createTransaction({
        projectId: txnProjectId,
        categoryId: txnCategoryId,
        description: txnDescription.trim(),
        amount: toNumber(txnAmount),
        occurredAt: txnDate,
        reference: txnReference.trim() || undefined,
        sourceType: txnSourceType,
      })
    ).unwrap();

    setTxnDialogOpen(false);
    setTxnDescription("");
    setTxnAmount("");
    setTxnReference("");
    setTxnSourceType("MANUAL");
    setTransactionsPage(1);

    if (selectedProjectId !== "ALL") {
      dispatch(fetchProjectTransactions({ projectId: selectedProjectId, page: 1, limit: TRANSACTIONS_PAGE_SIZE }));
      dispatch(fetchFinancialSummary(selectedProjectId));
    }
  };

  const totalTransactionPages = Math.max(1, Math.ceil(transactionsTotal / TRANSACTIONS_PAGE_SIZE));
  const canGoPrev = transactionsPage > 1;
  const canGoNext = transactionsPage < totalTransactionPages;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financials"
        description="Interactive financial operations: dashboard insights, project summary, budget management, categories, and transactions."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Billed" value={formatCurrency(normalizedDashboard.totalBilled)} icon={BarChart3} />
        <StatsCard title="Collected" value={formatCurrency(normalizedDashboard.totalCollected)} icon={DollarSign} />
        <StatsCard title="Outstanding" value={formatCurrency(normalizedDashboard.totalOutstanding)} icon={Receipt} />
        <StatsCard title="Active Projects" value={String(normalizedDashboard.activeProjects)} icon={FolderKanban} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Scope</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={selectedProjectId} onValueChange={(value) => setSelectedProjectId(value ?? "ALL")}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Category
          </Button>

          <Button onClick={() => setTxnDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Transaction
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="budget">Budget Management</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Financial Summary: {selectedProjectName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard title="Revenue" value={formatCurrency(normalizedSummary.totalRevenue)} icon={BarChart3} />
              <StatsCard title="Costs" value={formatCurrency(normalizedSummary.totalCosts)} icon={Receipt} />
              <StatsCard title="Net Profit" value={formatCurrency(normalizedSummary.netProfit)} subtitle={`${normalizedSummary.margin.toFixed(1)}%`} icon={DollarSign} />
              <StatsCard title="Budget Remaining" value={formatCurrency(normalizedSummary.remaining)} icon={FolderKanban} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Monthly Billed</p>
                <p className="text-xl font-semibold">{formatCurrency(normalizedDashboard.monthlyBilled)}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Monthly Collected</p>
                <p className="text-xl font-semibold">{formatCurrency(normalizedDashboard.monthlyCollected)}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Budget Alerts</p>
                <p className="text-xl font-semibold">{normalizedDashboard.budgetAlerts.length}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet. Create your first category to set project budgets.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <div key={category.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.code}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Project Budget Lines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleOpenBudgetLineDialog} disabled={availableBudgetCategories.length === 0}>
                  Add Budget Line
                </Button>
                <Button onClick={handleSaveBudget} disabled={!selectedProjectId || selectedProjectId === "ALL" || isLoading}>
                  <Save className="mr-2 h-4 w-4" /> Save Budget
                </Button>
              </div>

              {availableBudgetCategories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All budget categories already exist as line items. Create a new category to add more budget lines.
                </p>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Planned Amount</TableHead>
                    <TableHead>Threshold %</TableHead>
                    <TableHead>Actual Spent</TableHead>
                    <TableHead className="w-[72px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetDraft.map((line, idx) => (
                    <TableRow key={`${line.categoryId}-${idx}`}>
                      <TableCell>
                        <Select
                          value={line.categoryId}
                          onValueChange={(value) => {
                            if (!value) return;
                            const selected = categories.find((c) => c.id === value);
                            handleBudgetLineChange(idx, {
                              categoryId: value,
                              categoryName: selected?.name ?? line.categoryName,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={line.plannedAmount}
                          onChange={(e) => handleBudgetLineChange(idx, { plannedAmount: toNumber(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={line.thresholdPct}
                          onChange={(e) => handleBudgetLineChange(idx, { thresholdPct: toNumber(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(toNumber(line.actualAmount))}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBudgetLine(idx)}
                          aria-label="Remove budget line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {budgetDraft.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No budget lines yet for this project.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Transactions ({transactionsTotal})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{new Date(txn.occurredAt).toLocaleDateString()}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell>{txn.category?.name || categories.find((c) => c.id === txn.categoryId)?.name || "--"}</TableCell>
                      <TableCell>{txn.reference || "--"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(toNumber(txn.amount))}</TableCell>
                    </TableRow>
                  ))}

                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No transactions recorded for this project.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {transactionsPage} of {totalTransactionPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTransactionsPage((p) => Math.max(1, p - 1))}
                    disabled={!canGoPrev}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTransactionsPage((p) => Math.min(totalTransactionPages, p + 1))}
                    disabled={!canGoNext}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Budget Category</DialogTitle>
            <DialogDescription>Add a reusable category like Labour, Materials, Transport, or Equipment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input id="category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-code">Code</Label>
              <Input id="category-code" value={newCategoryCode} onChange={(e) => setNewCategoryCode(e.target.value.toUpperCase())} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory}>Create Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={budgetLineDialogOpen} onOpenChange={setBudgetLineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Budget Line Item</DialogTitle>
            <DialogDescription>Add a category allocation for this project budget as documented in the budget lines API.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newBudgetCategoryId} onValueChange={(value) => setNewBudgetCategoryId(value ?? "ALL")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableBudgetCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Planned Amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={newBudgetPlannedAmount}
                  onChange={(e) => setNewBudgetPlannedAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Threshold %</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newBudgetThresholdPct}
                  onChange={(e) => setNewBudgetThresholdPct(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetLineDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBudgetLine} disabled={!newBudgetCategoryId || newBudgetCategoryId === "ALL"}>
              Add Line Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={txnDialogOpen} onOpenChange={setTxnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Transaction</DialogTitle>
            <DialogDescription>Record project spend like equipment, overheads, transport, or manual adjustments.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={txnProjectId} onValueChange={(value) => setTxnProjectId(value ?? "ALL")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={txnCategoryId} onValueChange={(value) => setTxnCategoryId(value ?? "ALL")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={txnDescription} onChange={(e) => setTxnDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min="0" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePickerField value={txnDate} onChange={setTxnDate} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={txnReference} onChange={(e) => setTxnReference(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select value={txnSourceType} onValueChange={(value) => setTxnSourceType(value ?? "MANUAL")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_SOURCE_TYPES.map((sourceType) => (
                      <SelectItem key={sourceType} value={sourceType}>
                        {sourceType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTxnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTransaction}>Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
