import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Employee, PaginatedResponse, CreateEmployeeRequest, PayrollExportEntry } from "@/types";

interface EmployeesState {
  items: Employee[];
  total: number;
  current: Employee | null;
  payrollExport: PayrollExportEntry[];
  isLoading: boolean;
}

const initialState: EmployeesState = {
  items: [],
  total: 0,
  current: null,
  payrollExport: [],
  isLoading: false,
};

export const fetchEmployees = createAsyncThunk(
  "employees/fetchAll",
  async (params: Record<string, string | number | boolean | undefined> = {}) =>
    api.get<PaginatedResponse<Employee>>("/employees", params)
);

export const fetchEmployee = createAsyncThunk(
  "employees/fetchOne",
  async (id: string) => api.get<Employee>(`/employees/${id}`)
);

export const createEmployee = createAsyncThunk(
  "employees/create",
  async (data: CreateEmployeeRequest) => api.post<Employee>("/employees", data)
);

export const updateEmployee = createAsyncThunk(
  "employees/update",
  async ({ id, data }: { id: string; data: Partial<CreateEmployeeRequest> }) =>
    api.put<Employee>(`/employees/${id}`, data)
);

export const toggleEmployeeStatus = createAsyncThunk(
  "employees/toggleStatus",
  async ({ id, isActive }: { id: string; isActive: boolean }) =>
    api.put<Employee>(`/employees/${id}/status`, { isActive })
);

export const deleteEmployee = createAsyncThunk(
  "employees/delete",
  async (id: string) => {
    await api.delete<void>(`/employees/${id}`);
    return id;
  }
);

export const fetchPayrollExport = createAsyncThunk(
  "employees/payrollExport",
  async (params: { from: string; to: string }) =>
    api.get<PayrollExportEntry[]>("/employees/payroll-export", params)
);

const employeesSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    clearCurrentEmployee(state) { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.isLoading = true; })
      .addCase(fetchEmployees.fulfilled, (state, { payload }) => {
        state.items = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchEmployees.rejected, (state) => { state.isLoading = false; })
      .addCase(fetchEmployee.fulfilled, (state, { payload }) => { state.current = payload; })
      .addCase(createEmployee.fulfilled, (state, { payload }) => { state.items.unshift(payload); state.total++; })
      .addCase(updateEmployee.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((e) => e.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(toggleEmployeeStatus.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((e) => e.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(deleteEmployee.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((employee) => employee.id !== payload);
        state.total = Math.max(0, state.total - 1);
        if (state.current?.id === payload) state.current = null;
      })
      .addCase(fetchPayrollExport.fulfilled, (state, { payload }) => { state.payrollExport = payload; });
  },
});

export const { clearCurrentEmployee } = employeesSlice.actions;
export default employeesSlice.reducer;
