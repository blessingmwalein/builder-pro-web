import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Notification, PaginatedResponse } from "@/types";

interface NotificationsState {
  items: Notification[];
  total: number;
  unreadCount: number;
  isLoading: boolean;
}

const initialState: NotificationsState = {
  items: [],
  total: 0,
  unreadCount: 0,
  isLoading: false,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (params: { page?: number; limit?: number } = {}) =>
    api.get<PaginatedResponse<Notification>>("/notifications/me", params as Record<string, number>)
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id: string) => {
    await api.patch(`/notifications/${id}/read`, { isRead: true });
    return id;
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification(state, action) {
      state.items.unshift(action.payload);
      state.unreadCount++;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.isLoading = true; })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.items = payload.items;
        state.total = payload.meta.total;
        state.unreadCount = payload.items.filter((n) => !n.isRead).length;
        state.isLoading = false;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.isLoading = false; })
      .addCase(markNotificationRead.fulfilled, (state, { payload }) => {
        const n = state.items.find((i) => i.id === payload);
        if (n && !n.isRead) {
          n.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
