import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Quote, Variation, PaginatedResponse, CreateQuoteRequest } from "@/types";

interface QuotesState {
  items: Quote[];
  total: number;
  current: Quote | null;
  variations: Variation[];
  isLoading: boolean;
}

const initialState: QuotesState = {
  items: [],
  total: 0,
  current: null,
  variations: [],
  isLoading: false,
};

export const fetchQuotes = createAsyncThunk(
  "quotes/fetchAll",
  async (params: Record<string, string | number | undefined> = {}) =>
    api.get<PaginatedResponse<Quote>>("/quotes", params)
);

export const fetchQuote = createAsyncThunk(
  "quotes/fetchOne",
  async (id: string) => api.get<Quote>(`/quotes/${id}`)
);

export const createQuote = createAsyncThunk(
  "quotes/create",
  async (data: CreateQuoteRequest) => api.post<Quote>("/quotes", data)
);

export const updateQuote = createAsyncThunk(
  "quotes/update",
  async ({ id, data }: { id: string; data: Partial<CreateQuoteRequest> }) =>
    api.put<Quote>(`/quotes/${id}`, data)
);

export const sendQuote = createAsyncThunk(
  "quotes/send",
  async (id: string) => api.put<Quote>(`/quotes/${id}/send`)
);

export const approveQuote = createAsyncThunk(
  "quotes/approve",
  async (id: string) => api.put<Quote>(`/quotes/${id}/approve`)
);

export const rejectQuote = createAsyncThunk(
  "quotes/reject",
  async ({ id, notes }: { id: string; notes: string }) =>
    api.put<Quote>(`/quotes/${id}/reject`, { notes })
);

export const convertQuote = createAsyncThunk(
  "quotes/convert",
  async (id: string) => api.put<Quote>(`/quotes/${id}/convert`)
);

export const fetchVariations = createAsyncThunk(
  "quotes/fetchVariations",
  async (projectId: string) => api.get<Variation[]>(`/quotes/variations/${projectId}`)
);

const quotesSlice = createSlice({
  name: "quotes",
  initialState,
  reducers: {
    clearCurrentQuote(state) { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuotes.pending, (state) => { state.isLoading = true; })
      .addCase(fetchQuotes.fulfilled, (state, { payload }) => {
        state.items = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchQuotes.rejected, (state) => { state.isLoading = false; })
      .addCase(fetchQuote.fulfilled, (state, { payload }) => { state.current = payload; })
      .addCase(createQuote.fulfilled, (state, { payload }) => { state.items.unshift(payload); state.total++; })
      .addCase(updateQuote.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((q) => q.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(sendQuote.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((q) => q.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(approveQuote.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((q) => q.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
      })
      .addCase(fetchVariations.fulfilled, (state, { payload }) => { state.variations = payload; });
  },
});

export const { clearCurrentQuote } = quotesSlice.actions;
export default quotesSlice.reducer;
