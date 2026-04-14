import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";
import type {
  Project,
  ProjectDashboard,
  PaginatedResponse,
  PaginationParams,
  CreateProjectRequest,
  ProjectMember,
} from "@/types";

interface ProjectsState {
  items: Project[];
  total: number;
  current: Project | null;
  dashboard: ProjectDashboard | null;
  members: ProjectMember[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  items: [],
  total: 0,
  current: null,
  dashboard: null,
  members: [],
  isLoading: false,
  error: null,
};

export const fetchProjects = createAsyncThunk(
  "projects/fetchAll",
  async (params: PaginationParams & { status?: string } = {}) => {
    return api.get<PaginatedResponse<Project>>("/projects", params as Record<string, string | number>);
  }
);

export const fetchProject = createAsyncThunk(
  "projects/fetchOne",
  async (id: string) => api.get<Project>(`/projects/${id}`)
);

export const fetchProjectDashboard = createAsyncThunk(
  "projects/fetchDashboard",
  async (id: string) => api.get<ProjectDashboard>(`/projects/${id}/dashboard`)
);

export const createProject = createAsyncThunk(
  "projects/create",
  async (data: CreateProjectRequest) => api.post<Project>("/projects", data)
);

export const updateProject = createAsyncThunk(
  "projects/update",
  async ({ id, data }: { id: string; data: Partial<CreateProjectRequest> }) =>
    api.put<Project>(`/projects/${id}`, data)
);

export const deleteProject = createAsyncThunk(
  "projects/delete",
  async (id: string) => {
    await api.delete(`/projects/${id}`);
    return id;
  }
);

export const fetchProjectMembers = createAsyncThunk(
  "projects/fetchMembers",
  async (projectId: string) => api.get<ProjectMember[]>(`/projects/${projectId}/members`)
);

export const addProjectMember = createAsyncThunk(
  "projects/addMember",
  async ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) => {
    await api.post(`/projects/${projectId}/members`, { userId, role });
    return api.get<ProjectMember[]>(`/projects/${projectId}/members`);
  }
);

export const removeProjectMember = createAsyncThunk(
  "projects/removeMember",
  async ({ projectId, userId }: { projectId: string; userId: string }) => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
    return api.get<ProjectMember[]>(`/projects/${projectId}/members`);
  }
);

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null;
      state.dashboard = null;
      state.members = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchProjects.fulfilled, (state, { payload }) => {
        state.items = payload.items;
        state.total = payload.meta.total;
        state.isLoading = false;
      })
      .addCase(fetchProjects.rejected, (state, { error }) => {
        state.isLoading = false;
        state.error = error.message || "Failed to fetch projects";
      })
      .addCase(fetchProject.fulfilled, (state, { payload }) => { state.current = payload; })
      .addCase(fetchProjectDashboard.fulfilled, (state, { payload }) => { state.dashboard = payload; })
      .addCase(createProject.fulfilled, (state, { payload }) => { state.items.unshift(payload); state.total++; })
      .addCase(updateProject.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((p) => p.id === payload.id);
        if (idx >= 0) state.items[idx] = payload;
        if (state.current?.id === payload.id) state.current = payload;
      })
      .addCase(deleteProject.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((p) => p.id !== payload);
        state.total--;
      })
      .addCase(fetchProjectMembers.fulfilled, (state, { payload }) => { state.members = payload; })
      .addCase(addProjectMember.fulfilled, (state, { payload }) => { state.members = payload; })
      .addCase(removeProjectMember.fulfilled, (state, { payload }) => { state.members = payload; });
  },
});

export const { clearCurrent } = projectsSlice.actions;
export default projectsSlice.reducer;
