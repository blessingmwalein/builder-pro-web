import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type {
  FinancialDashboard,
  ProjectBudget,
  BudgetLine,
  BudgetCategory,
  FinancialTransaction,
  PaginatedResponse,
} from "@/types";

interface FinancialsState {
  dashboard: FinancialDashboard | null;
  summary: Record<string, unknown> | null;
  projectBudget: ProjectBudget | null;
  categories: BudgetCategory[];
  transactions: FinancialTransaction[];
  transactionsTotal: number;
  isLoading: boolean;
}

const initialState: FinancialsState = {
  dashboard: null,
  summary: null,
  projectBudget: null,
  categories: [],
  transactions: [],
  transactionsTotal: 0,
  isLoading: false,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeProjectBudget(raw: unknown): ProjectBudget {
  const data = (raw ?? {}) as Record<string, unknown>;
  const project = (data.project ?? {}) as Record<string, unknown>;

  const sourceLines = Array.isArray(data.lines)
    ? (data.lines as Array<Record<string, unknown>>)
    : Array.isArray(data.budgets)
      ? (data.budgets as Array<Record<string, unknown>>)
      : [];

  const lines: BudgetLine[] = sourceLines.map((line) => {
    const category = (line.category ?? {}) as Record<string, unknown>;
    return {
      categoryId: String(line.categoryId ?? category.id ?? ""),
      categoryName: String(line.categoryName ?? category.name ?? "Uncategorized"),
      plannedAmount: toNumber(line.plannedAmount),
      actualAmount: toNumber(line.actualAmount),
      variance:
        line.variance !== undefined
          ? toNumber(line.variance)
          : line.varianceAmount !== undefined
            ? toNumber(line.varianceAmount)
            : toNumber(line.plannedAmount) - toNumber(line.actualAmount),
      thresholdPct: toNumber(line.thresholdPct),
    };
  });

  return {
    projectId: String(data.projectId ?? project.id ?? ""),
    totalBudget: toNumber(data.totalBudget ?? data.totalPlanned),
    totalSpent: toNumber(data.totalSpent ?? data.totalActual),
    remaining:
      data.remaining !== undefined
        ? toNumber(data.remaining)
        : toNumber(data.totalBudget ?? data.totalPlanned) - toNumber(data.totalSpent ?? data.totalActual),
    percentUsed: toNumber(data.percentUsed),
    lines,
  };
}

export const fetchFinancialDashboard = createAsyncThunk(
  "financials/fetchDashboard",
  async () => api.get<FinancialDashboard>("/financials/dashboard")
);

export const fetchFinancialSummary = createAsyncThunk(
  "financials/fetchSummary",
  async (projectId: string) =>
    api.get<Record<string, unknown>>("/financials/summary", { projectId })
);

export const fetchProjectBudget = createAsyncThunk(
  "financials/fetchProjectBudget",
  async (projectId: string) =>
    normalizeProjectBudget(await api.get<unknown>(`/financials/projects/${projectId}/budget`))
);

export const updateProjectBudget = createAsyncThunk(
  "financials/updateProjectBudget",
  async ({ projectId, lines }: { projectId: string; lines: { categoryId: string; plannedAmount: number; thresholdPct: number }[] }) =>
    normalizeProjectBudget(
      await api.put<unknown>(`/financials/projects/${projectId}/budget`, { lines })
    )
);

export const fetchBudgetCategories = createAsyncThunk(
  "financials/fetchCategories",
  async () => api.get<BudgetCategory[]>("/financials/budget-categories")
);

export const createBudgetCategory = createAsyncThunk(
  "financials/createCategory",
  async ({ name, code }: { name: string; code: string }) =>
    api.post<BudgetCategory>("/financials/budget-categories", { name, code })
);

export const fetchProjectTransactions = createAsyncThunk(
  "financials/fetchTransactions",
  async ({ projectId, ...params }: { projectId: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<FinancialTransaction>>(`/financials/projects/${projectId}/transactions`, params as Record<string, string | number>)
);

export const createTransaction = createAsyncThunk(
  "financials/createTransaction",
  async (data: {
    projectId: string;
    categoryId: string;
    description: string;
    amount: number;
    occurredAt: string;
    reference?: string;
    sourceType?: string;
  }) =>
    api.post<FinancialTransaction>("/financials/transactions", data)
);

const financialsSlice = createSlice({
  name: "financials",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinancialDashboard.pending, (state) => { state.isLoading = true; })
      .addCase(fetchFinancialDashboard.fulfilled, (state, { payload }) => {
        state.dashboard = payload;
        state.isLoading = false;
      })
      .addCase(fetchFinancialDashboard.rejected, (state) => { state.isLoading = false; })
      .addCase(fetchFinancialSummary.fulfilled, (state, { payload }) => { state.summary = payload; })
      .addCase(fetchProjectBudget.fulfilled, (state, { payload }) => { state.projectBudget = payload; })
      .addCase(updateProjectBudget.fulfilled, (state, { payload }) => { state.projectBudget = payload; })
      .addCase(fetchBudgetCategories.fulfilled, (state, { payload }) => { state.categories = payload; })
      .addCase(createBudgetCategory.fulfilled, (state, { payload }) => {
        state.categories.unshift(payload);
      })
      .addCase(fetchProjectTransactions.fulfilled, (state, { payload }) => {
        state.transactions = payload.items;
        state.transactionsTotal = payload.meta.total;
      })
      .addCase(createTransaction.fulfilled, (state, { payload }) => {
        state.transactions.unshift(payload);
      });
  },
});

export default financialsSlice.reducer;
