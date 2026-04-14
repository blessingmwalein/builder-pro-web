import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Invoice, AgingReport, PaginatedResponse, CreateInvoiceRequest, Payment, PaymentMethod } from "@/types";

interface InvoicesState {
  items: Invoice[];
  total: number;
  current: Invoice | null;
  agingReport: AgingReport | null;
  isLoading: boolean;
}

const initialState: InvoicesState = {
  items: [],
  total: 0,
  current: null,
  agingReport: null,
  isLoading: false,
};

export const fetchInvoices = createAsyncThunk(
  "invoices/fetchAll",
  async (params: Record<string, string | number | undefined> = {}) =>
    api.get<PaginatedResponse<Invoice>>("/invoices", params)
);

export const fetchInvoice = createAsyncThunk(
  "invoices/fetchOne",
  async (id: string) => api.get<Invoice>(`/invoices/${id}`)
);

export const createInvoice = createAsyncThunk(
  "invoices/create",
  async (data: CreateInvoiceRequest) => api.post<Invoice>("/invoices", data)
);

export const updateInvoice = createAsyncThunk(
  "invoices/update",
  async ({ id, data }: { id: string; data: Partial<CreateInvoiceRequest> }) =>
    api.put<Invoice>(`/invoices/${id}`, data)
);

export const sendInvoice = createAsyncThunk(
  "invoices/send",
  async (id: string) => api.put<Invoice>(`/invoices/${id}/send`)
);

export const recordPayment = createAsyncThunk(
  "invoices/recordPayment",
  async ({ invoiceId, method, amount }: { invoiceId: string; method: PaymentMethod; amount: number }) =>
    api.post<Payment>(`/invoices/${invoiceId}/payments`, { method, amount })
);

export const fetchAgingReport = createAsyncThunk(
  "invoices/fetchAging",
  async () => api.get<AgingReport>("/invoices/aging-report")
);

export const voidInvoice = createAsyncThunk(
  "invoices/void",
  async (id: string) => api.put<Invoice>(`/invoices/${id}/void`)
);

const invoicesSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    clearCurrentInvoice(state) { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => { state.isLoading = true; })
      .addCase(fetchInvoices.fulfilled, (state, { payload }) => {
        state.items = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchInvoices.rejected, (state) => { state.isLoading = false; })
      .addCase(fetchInvoice.fulfilled, (state, { payload }) => { state.current = payload; })
      .addCase(createInvoice.fulfilled, (state, { payload }) => { state.items.unshift(payload); state.total++; })
      .addCase(sendInvoice.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((i) => i.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(fetchAgingReport.fulfilled, (state, { payload }) => { state.agingReport = payload; })
      .addCase(voidInvoice.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((i) => i.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
      });
  },
});

export const { clearCurrentInvoice } = invoicesSlice.actions;
export default invoicesSlice.reducer;
