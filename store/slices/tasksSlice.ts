import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type { Task, PaginatedResponse, CreateTaskRequest, TaskComment, Checklist } from "@/types";

interface TasksState {
  items: Task[];
  total: number;
  myQueue: Task[];
  current: Task | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  total: 0,
  myQueue: [],
  current: null,
  isLoading: false,
  error: null,
};

export const fetchTasks = createAsyncThunk(
  "tasks/fetchAll",
  async (params: Record<string, string | number | boolean | undefined> = {}) =>
    api.get<PaginatedResponse<Task>>("/tasks", params)
);

export const fetchMyQueue = createAsyncThunk(
  "tasks/fetchMyQueue",
  async () => api.get<Task[]>("/tasks/my-queue")
);

export const fetchTask = createAsyncThunk(
  "tasks/fetchOne",
  async (id: string) => api.get<Task>(`/tasks/${id}`)
);

export const createTask = createAsyncThunk(
  "tasks/create",
  async (data: CreateTaskRequest) => api.post<Task>("/tasks", data)
);

export const updateTask = createAsyncThunk(
  "tasks/update",
  async ({ id, data }: { id: string; data: Partial<CreateTaskRequest> }) =>
    api.put<Task>(`/tasks/${id}`, data)
);

export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async ({ id, status }: { id: string; status: string }) =>
    api.put<Task>(`/tasks/${id}/status`, { status })
);

export const addComment = createAsyncThunk(
  "tasks/addComment",
  async ({ taskId, content }: { taskId: string; content: string }) =>
    api.post<TaskComment>(`/tasks/${taskId}/comments`, { content })
);

export const deleteTask = createAsyncThunk(
  "tasks/delete",
  async (id: string) => {
    await api.delete(`/tasks/${id}`);
    return id;
  }
);

export const addTaskAssignee = createAsyncThunk(
  "tasks/addTaskAssignee",
  async ({ id, userId }: { id: string; userId: string }) => {
    await api.post(`/tasks/${id}/assignees/${userId}`);
    return { id, userId };
  }
);

export const removeTaskAssignee = createAsyncThunk(
  "tasks/removeTaskAssignee",
  async ({ id, userId }: { id: string; userId: string }) => {
    await api.delete(`/tasks/${id}/assignees/${userId}`);
    return { id, userId };
  }
);

export const fetchTaskComments = createAsyncThunk(
  "tasks/fetchTaskComments",
  async (taskId: string) => {
    const comments = await api.get<TaskComment[]>(`/tasks/${taskId}/comments`);
    return { taskId, comments };
  }
);

export const createTaskChecklist = createAsyncThunk(
  "tasks/createTaskChecklist",
  async ({ taskId, title, items }: { taskId: string; title: string; items: string[] }) => {
    const checklist = await api.post<Checklist>(`/tasks/${taskId}/checklists`, { title, items });
    return { taskId, checklist };
  }
);

export const toggleChecklistItem = createAsyncThunk(
  "tasks/toggleChecklistItem",
  async ({
    taskId,
    checklistId,
    itemId,
  }: {
    taskId: string;
    checklistId: string;
    itemId: string;
  }) => {
    const updatedTask = await api.put<Task>(
      `/tasks/${taskId}/checklists/${checklistId}/items/${itemId}/toggle`
    );
    return updatedTask;
  }
);

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    clearCurrentTask(state) { state.current = null; },
    moveTask(state, action) {
      const { taskId, newStatus } = action.payload;
      const task = state.items.find((t) => t.id === taskId);
      if (task) task.status = newStatus;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.isLoading = true; })
      .addCase(fetchTasks.fulfilled, (state, { payload }) => {
        state.items = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchTasks.rejected, (state, { error }) => {
        state.isLoading = false;
        state.error = error.message || "Failed to fetch tasks";
      })
      .addCase(fetchMyQueue.fulfilled, (state, { payload }) => { state.myQueue = payload; })
      .addCase(fetchTask.fulfilled, (state, { payload }) => { state.current = payload; })
      .addCase(createTask.fulfilled, (state, { payload }) => { state.items.unshift(payload); state.total++; })
      .addCase(deleteTask.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((t) => t.id !== payload);
        state.myQueue = state.myQueue.filter((t) => t.id !== payload);
        if (state.current?.id === payload) state.current = null;
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(updateTask.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(updateTaskStatus.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        const queueIdx = state.myQueue.findIndex((t) => t.id === payload.id);
        if (queueIdx >= 0) state.myQueue[queueIdx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(addTaskAssignee.fulfilled, (state, { payload }) => {
        if (state.current?.id === payload.id) {
          state.current = { ...state.current };
        }
      })
      .addCase(removeTaskAssignee.fulfilled, (state, { payload }) => {
        const task = state.items.find((t) => t.id === payload.id);
        if (task) {
          task.assignees = task.assignees.filter((a) => a.id !== payload.userId);
        }
      })
      .addCase(fetchTaskComments.fulfilled, (state, { payload }) => {
        if (state.current?.id === payload.taskId) {
          state.current.comments = payload.comments;
        }
      })
      .addCase(addComment.fulfilled, (state, { payload }) => {
        if (state.current) {
          state.current.comments = [...(state.current.comments ?? []), payload];
        }
      })
      .addCase(createTaskChecklist.fulfilled, (state, { payload }) => {
        if (state.current?.id === payload.taskId) {
          state.current.checklists = [...(state.current.checklists ?? []), payload.checklist];
        }
      })
      .addCase(toggleChecklistItem.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      });
  },
});

export const { clearCurrentTask, moveTask } = tasksSlice.actions;
export default tasksSlice.reducer;
