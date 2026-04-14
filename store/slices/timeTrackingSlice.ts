import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { TimeEntry, PaginatedResponse, ClockInRequest, ClockOutRequest, WeeklySummary } from "@/types";

interface TimeTrackingState {
  entries: TimeEntry[];
  total: number;
  activeEntry: TimeEntry | null;
  weeklySummary: WeeklySummary | null;
  isLoading: boolean;
}

const initialState: TimeTrackingState = {
  entries: [],
  total: 0,
  activeEntry: null,
  weeklySummary: null,
  isLoading: false,
};

export const fetchTimeEntries = createAsyncThunk(
  "timeTracking/fetchAll",
  async (params: Record<string, string | number | undefined> = {}) =>
    api.get<PaginatedResponse<TimeEntry>>("/time-tracking", params)
);

export const fetchActiveEntry = createAsyncThunk(
  "timeTracking/fetchActive",
  async () => api.get<TimeEntry | null>("/time-tracking/active")
);

export const clockIn = createAsyncThunk(
  "timeTracking/clockIn",
  async (data: ClockInRequest) => api.post<TimeEntry>("/time-tracking/clock-in", data)
);

export const clockOut = createAsyncThunk(
  "timeTracking/clockOut",
  async ({ entryId, data }: { entryId: string; data: ClockOutRequest }) =>
    api.put<TimeEntry>(`/time-tracking/${entryId}/clock-out`, data)
);

export const approveTimeEntry = createAsyncThunk(
  "timeTracking/approve",
  async ({ entryId, status, comment }: { entryId: string; status: "APPROVED" | "REJECTED"; comment?: string }) =>
    api.put<TimeEntry>(`/time-tracking/${entryId}/approve`, { status, approvalComment: comment })
);

export const createManualTimeEntry = createAsyncThunk(
  "timeTracking/createManual",
  async (data: {
    projectId: string;
    taskId?: string;
    clockInAt: string;
    clockOutAt: string;
    breakMinutes?: number;
    notes?: string;
  }) => api.post<TimeEntry>("/time-tracking/manual", data)
);

export const fetchWeeklySummary = createAsyncThunk(
  "timeTracking/weeklySummary",
  async (weekStart: string) => api.get<WeeklySummary>("/time-tracking/weekly-summary", { weekStart })
);

const timeTrackingSlice = createSlice({
  name: "timeTracking",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimeEntries.pending, (state) => { state.isLoading = true; })
      .addCase(fetchTimeEntries.fulfilled, (state, { payload }) => {
        state.entries = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchTimeEntries.rejected, (state) => { state.isLoading = false; })
      .addCase(fetchActiveEntry.fulfilled, (state, { payload }) => { state.activeEntry = payload; })
      .addCase(clockIn.fulfilled, (state, { payload }) => { state.activeEntry = payload; })
      .addCase(clockOut.fulfilled, (state, { payload }) => {
        state.activeEntry = null;
        state.entries.unshift(payload);
      })
      .addCase(approveTimeEntry.fulfilled, (state, { payload }) => {
        const idx = state.entries.findIndex((e) => e.id === payload.id);
        if (idx >= 0) state.entries[idx] = payload;
      })
      .addCase(createManualTimeEntry.fulfilled, (state, { payload }) => {
        state.entries.unshift(payload);
        state.total += 1;
      })
      .addCase(fetchWeeklySummary.fulfilled, (state, { payload }) => { state.weeklySummary = payload; });
  },
});

export default timeTrackingSlice.reducer;
