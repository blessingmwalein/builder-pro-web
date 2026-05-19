import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { ApiError, setTokens, setTenantSlug, clearAuth } from "@/lib/api";
import type {
  AuthState,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  MeResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "@/types";

const initialState: AuthState = {
  user: null,
  tenant: null,
  permissions: [],
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  subscriptionExpired: false,
  subscriptionErrorCode: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest, { rejectWithValue }) => {
    const data = await api.public.post<LoginResponse>("/auth/login", credentials);
    setTokens(data.accessToken, data.refreshToken);
    try {
      const me = await api.get<MeResponse>("/auth/me");
      setTenantSlug(me.tenant.slug);
      return { tokens: data, me };
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        const code = (err.data as { code?: string } | null)?.code;
        return rejectWithValue({ status: 402, message: err.message, code });
      }
      throw err;
    }
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

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<MeResponse>("/auth/me");
    } catch (err) {
      if (err instanceof ApiError) {
        const code = (err.data as { code?: string } | null)?.code;
        return rejectWithValue({ status: err.status, message: err.message, code });
      }
      return rejectWithValue({ status: 0, message: String(err) });
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (payload: ForgotPasswordRequest) => {
    return api.public.post<ForgotPasswordResponse>("/auth/forgot-password", payload);
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (payload: ResetPasswordRequest) => {
    return api.public.post<ResetPasswordResponse>("/auth/reset-password", payload);
  }
);

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
      state.subscriptionExpired = false;
      state.subscriptionErrorCode = null;
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
        state.subscriptionExpired = false;
        state.subscriptionErrorCode = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        const payload = action.payload as { status?: number; code?: string } | undefined;
        if (payload?.status === 402) {
          state.subscriptionExpired = true;
          state.subscriptionErrorCode = payload.code ?? 'SUBSCRIPTION_EXPIRED';
        }
      })
      // Register
      .addCase(register.fulfilled, (state, { payload }) => {
        state.accessToken = payload.registration.accessToken;
        state.user = payload.me.user;
        state.tenant = payload.me.tenant;
        state.permissions = payload.me.permissions;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.subscriptionExpired = false;
        state.subscriptionErrorCode = null;
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
        state.subscriptionExpired = false;
        state.subscriptionErrorCode = null;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        const payload = action.payload as { status?: number; code?: string } | undefined;
        if (payload?.status === 402) {
          // Authenticated but subscription expired — keep tokens so PaymentModal works.
          state.isAuthenticated = false;
          state.isLoading = false;
          state.subscriptionExpired = true;
          state.subscriptionErrorCode = payload.code ?? 'SUBSCRIPTION_EXPIRED';
          // Do NOT call clearAuth() — tokens must stay for the activation call.
        } else {
          state.isAuthenticated = false;
          state.isLoading = false;
          state.subscriptionExpired = false;
          state.subscriptionErrorCode = null;
          clearAuth();
        }
      });
  },
});

export const { logout, setLoading, hydrateFromStorage } = authSlice.actions;
export default authSlice.reducer;
