import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type {
  FinancialDashboard,
  ProjectBudget,
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
    api.get<ProjectBudget>(`/financials/projects/${projectId}/budget`)
);

export const updateProjectBudget = createAsyncThunk(
  "financials/updateProjectBudget",
  async ({ projectId, lines }: { projectId: string; lines: { categoryId: string; plannedAmount: number; thresholdPct: number }[] }) =>
    api.put<ProjectBudget>(`/financials/projects/${projectId}/budget`, { lines })
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
