import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { setTokens, setTenantSlug, clearAuth } from "@/lib/api";
import type {
  AuthState,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  MeResponse,
} from "@/types";

const initialState: AuthState = {
  user: null,
  tenant: null,
  permissions: [],
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest) => {
    const data = await api.public.post<LoginResponse>("/auth/login", credentials);
    setTokens(data.accessToken, data.refreshToken);
    const me = await api.get<MeResponse>("/auth/me");
    setTenantSlug(me.tenant.slug);
    return { tokens: data, me };
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (payload: RegisterRequest) => {
    const data = await api.public.post<RegisterResponse>("/onboarding/register", payload);
    setTokens(data.accessToken, data.refreshToken);
    setTenantSlug(data.company.slug);
    const me = await api.get<MeResponse>("/auth/me");
    return { registration: data, me };
  }
);

export const fetchMe = createAsyncThunk("auth/fetchMe", async () => {
  return api.get<MeResponse>("/auth/me");
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      clearAuth();
      state.user = null;
      state.tenant = null;
      state.permissions = [];
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    hydrateFromStorage(state) {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("bp_access_token");
      if (token) {
        state.accessToken = token;
        state.refreshToken = localStorage.getItem("bp_refresh_token");
      } else {
        state.isLoading = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.accessToken = payload.tokens.accessToken;
        state.refreshToken = payload.tokens.refreshToken;
        state.user = payload.me.user;
        state.tenant = payload.me.tenant;
        state.permissions = payload.me.permissions;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(login.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.fulfilled, (state, { payload }) => {
        state.accessToken = payload.registration.accessToken;
        state.user = payload.me.user;
        state.tenant = payload.me.tenant;
        state.permissions = payload.me.permissions;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(register.rejected, (state) => {
        state.isLoading = false;
      })
      // Fetch Me
      .addCase(fetchMe.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload.user;
        state.tenant = payload.tenant;
        state.permissions = payload.permissions;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.isAuthenticated = false;
        state.isLoading = false;
        clearAuth();
      });
  },
});

export const { logout, setLoading, hydrateFromStorage } = authSlice.actions;
export default authSlice.reducer;
