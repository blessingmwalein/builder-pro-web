import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Material, MaterialUsageLog, Supplier, PaginatedResponse, CreateMaterialUsageRequest } from "@/types";

interface MaterialsState {
  items: Material[];
  total: number;
  usageLogs: MaterialUsageLog[];
  usageTotal: number;
  lowStock: Material[];
  suppliers: Supplier[];
  isLoading: boolean;
}

const initialState: MaterialsState = {
  items: [],
  total: 0,
  usageLogs: [],
  usageTotal: 0,
  lowStock: [],
  suppliers: [],
  isLoading: false,
};

export const fetchMaterials = createAsyncThunk(
  "materials/fetchAll",
  async (params: Record<string, string | number | boolean | undefined> = {}) =>
    api.get<PaginatedResponse<Material>>("/materials", params)
);

export const createMaterial = createAsyncThunk(
  "materials/create",
  async (data: { name: string; sku?: string; unit: string; unitCost: number; supplierId?: string }) =>
    api.post<Material>("/materials", data)
);

export const fetchLowStock = createAsyncThunk(
  "materials/fetchLowStock",
  async () => api.get<Material[]>("/materials/low-stock")
);

export const logMaterialUsage = createAsyncThunk(
  "materials/logUsage",
  async (data: CreateMaterialUsageRequest) => api.post<MaterialUsageLog>("/materials/usage", data)
);

export const fetchUsageLogs = createAsyncThunk(
  "materials/fetchUsageLogs",
  async (params: Record<string, string | number | undefined> = {}) =>
    api.get<PaginatedResponse<MaterialUsageLog>>("/materials/logs", params)
);

export const fetchSuppliers = createAsyncThunk(
  "materials/fetchSuppliers",
  async (params: Record<string, string | number | undefined> = {}) =>
    api.get<PaginatedResponse<Supplier>>("/materials/suppliers/list", params)
);

export const createSupplier = createAsyncThunk(
  "materials/createSupplier",
  async (data: Omit<Supplier, "id">) => api.post<Supplier>("/materials/suppliers", data)
);

const materialsSlice = createSlice({
  name: "materials",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterials.pending, (state) => { state.isLoading = true; })
      .addCase(fetchMaterials.fulfilled, (state, { payload }) => {
        state.items = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchMaterials.rejected, (state) => { state.isLoading = false; })
      .addCase(createMaterial.fulfilled, (state, { payload }) => { state.items.unshift(payload); state.total++; })
      .addCase(fetchLowStock.fulfilled, (state, { payload }) => { state.lowStock = payload; })
      .addCase(logMaterialUsage.fulfilled, (state, { payload }) => { state.usageLogs.unshift(payload); })
      .addCase(fetchUsageLogs.fulfilled, (state, { payload }) => {
        state.usageLogs = payload.items;
        state.usageTotal = payload.meta.total;
      })
      .addCase(fetchSuppliers.fulfilled, (state, { payload }) => { state.suppliers = payload.items; })
      .addCase(createSupplier.fulfilled, (state, { payload }) => { state.suppliers.unshift(payload); });
  },
});

export default materialsSlice.reducer;
