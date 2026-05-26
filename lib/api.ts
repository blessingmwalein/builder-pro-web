// ============================================================
// ownit2buildit — API Client with JWT auth, refresh, tenant scope
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;

  const candidate = data as { message?: unknown; error?: unknown };

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }

  if (Array.isArray(candidate.message) && candidate.message.length > 0) {
    const first = candidate.message.find((item) => typeof item === "string" && item.trim());
    if (typeof first === "string") return first;
  }

  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }

  return fallback;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bp_access_token");
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bp_refresh_token");
}

function getTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bp_tenant_slug");
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem("bp_access_token", access);
  if (refresh) localStorage.setItem("bp_refresh_token", refresh);
  // Mirror in cookies so Next.js middleware can read them (localStorage is client-only).
  // max-age=604800 (7 days) — middleware only checks presence, not validity.
  document.cookie = `bp_access_token=${encodeURIComponent(access)}; path=/; SameSite=Strict; max-age=604800`;
  if (refresh) {
    document.cookie = `bp_refresh_token=${encodeURIComponent(refresh)}; path=/; SameSite=Strict; max-age=604800`;
  }
}

export function setTenantSlug(slug: string) {
  localStorage.setItem("bp_tenant_slug", slug);
  document.cookie = `bp_tenant_slug=${encodeURIComponent(slug)}; path=/; SameSite=Strict; max-age=86400`;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bp_access_token");
  localStorage.removeItem("bp_refresh_token");
  localStorage.removeItem("bp_tenant_slug");
  document.cookie = "bp_access_token=; path=/; max-age=0; SameSite=Strict";
  document.cookie = "bp_refresh_token=; path=/; max-age=0; SameSite=Strict";
  document.cookie = "bp_tenant_slug=; path=/; max-age=0; SameSite=Strict";
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearAuth();
        return null;
      }

      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } catch {
      clearAuth();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== "") {
        url.searchParams.set(key, String(val));
      }
    });
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, headers = {}, skipAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) requestHeaders["Authorization"] = `Bearer ${token}`;
    const slug = getTenantSlug();
    if (slug) requestHeaders["x-tenant-slug"] = slug;
  }

  let res = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 → refresh token flow
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(buildUrl(path, params), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired");
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => null);

    // Subscription gate — redirect to the expired page so users can upgrade.
    if (res.status === 402 && typeof window !== 'undefined') {
      // Only exempt pages that would loop (the destination itself and activation flows).
      const exemptPaths = ['/subscription', '/accept-invite'];
      const isExempt = exemptPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isExempt) {
        const code = (errData as { code?: string } | null)?.code ?? '';
        window.location.href = `/subscription-expired?reason=${encodeURIComponent(code)}`;
      }
      throw new ApiError(402, 'Subscription required', errData);
    }

    throw new ApiError(res.status, extractErrorMessage(errData, res.statusText), errData);
  }

  if (res.status === 204) return undefined as T;

  // Guard against empty response bodies that would fail JSON.parse
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ---- Convenience methods ----

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(path, { params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),

  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getStoredToken();
    const slug = getTenantSlug();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (slug) headers["x-tenant-slug"] = slug;
    const url = buildUrl(path);
    let res = await fetch(url, { method: "POST", headers, body: formData });

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(url, { method: "POST", headers, body: formData });
      } else {
        if (typeof window !== "undefined") window.location.href = "/login";
        throw new ApiError(401, "Session expired");
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new ApiError(res.status, extractErrorMessage(errData, res.statusText), errData);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  },

  // Public endpoints (no auth)
  public: {
    get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
      request<T>(path, { params, skipAuth: true }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body, skipAuth: true }),
  },
};

export { ApiError };
export default api;
