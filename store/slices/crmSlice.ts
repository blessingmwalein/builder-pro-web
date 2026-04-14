import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Client, PaginatedResponse, CreateClientRequest } from "@/types";

interface CrmState {
  clients: Client[];
  total: number;
  current: Client | null;
  isLoading: boolean;
}

const initialState: CrmState = {
  clients: [],
  total: 0,
  current: null,
  isLoading: false,
};

export const fetchClients = createAsyncThunk(
  "crm/fetchClients",
  async (params: Record<string, string | number | undefined> = {}) =>
    api.get<PaginatedResponse<Client>>("/crm/clients", params)
);

export const fetchClient = createAsyncThunk(
  "crm/fetchClient",
  async (id: string) => api.get<Client>(`/crm/clients/${id}`)
);

export const createClient = createAsyncThunk(
  "crm/createClient",
  async (data: CreateClientRequest) => api.post<Client>("/crm/clients", data)
);

export const updateClient = createAsyncThunk(
  "crm/updateClient",
  async ({ id, data }: { id: string; data: Partial<CreateClientRequest> }) =>
    api.put<Client>(`/crm/clients/${id}`, data)
);

export const deleteClient = createAsyncThunk(
  "crm/deleteClient",
  async (id: string) => { await api.delete(`/crm/clients/${id}`); return id; }
);

const crmSlice = createSlice({
  name: "crm",
  initialState,
  reducers: {
    clearCurrentClient(state) { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => { state.isLoading = true; })
      .addCase(fetchClients.fulfilled, (state, { payload }) => {
        state.clients = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchClients.rejected, (state) => { state.isLoading = false; })
      .addCase(fetchClient.fulfilled, (state, { payload }) => { state.current = payload; })
      .addCase(createClient.fulfilled, (state, { payload }) => { state.clients.unshift(payload); state.total++; })
      .addCase(updateClient.fulfilled, (state, { payload }) => {
        const idx = state.clients.findIndex((c) => c.id === payload.id);
        if (idx >= 0) state.clients[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(deleteClient.fulfilled, (state, { payload }) => {
        state.clients = state.clients.filter((c) => c.id !== payload);
        state.total--;
      });
  },
});

export const { clearCurrentClient } = crmSlice.actions;
export default crmSlice.reducer;
