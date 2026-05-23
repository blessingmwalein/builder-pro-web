export type ElectrosalesProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  priceExclVat: number;
  availability: string;
  supplierName: string;
  description: string;
  breadcrumbs: string[];
  imageUrl?: string | null;
  uom?: string;
};

export type ElectrosalesDepartment = {
  id?: number | string;
  name?: string;
  label?: string;
};

// ─── Browser-side cache ───────────────────────────────────────────────────────
// Populated on first call to preloadElectrosalesProducts().
// Subsequent searches filter locally — no network round-trip.

let browserCache: ElectrosalesProduct[] = [];
let preloadPromise: Promise<ElectrosalesProduct[]> | null = null;

/**
 * Pre-fetches the full Electrosales catalog from the server-side cache.
 * Call this when a modal/page opens so the search feels instant.
 * Safe to call multiple times — only one network request ever fires.
 */
export async function preloadElectrosalesProducts(): Promise<ElectrosalesProduct[]> {
  if (browserCache.length > 0) return browserCache;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      const res = await fetch("/api/electrosales/products?all=1", { method: "GET" });
      if (!res.ok) return [];
      const payload = (await res.json()) as { items?: ElectrosalesProduct[] };
      browserCache = Array.isArray(payload.items) ? payload.items : [];
    } catch {
      browserCache = [];
    }
    preloadPromise = null;
    return browserCache;
  })();

  return preloadPromise;
}

/**
 * Search the Electrosales catalog.
 * Uses browser-side cache when available (instant), otherwise falls back
 * to a server-proxied API search.
 */
export async function searchElectrosalesProducts(
  query: string,
  limit = 12,
): Promise<ElectrosalesProduct[]> {
  if (!query.trim()) return [];

  // Fast path — filter from browser cache
  if (browserCache.length > 0) {
    const q = query.toLowerCase();
    return browserCache
      .filter((p) =>
        `${p.name} ${p.sku} ${p.description} ${p.supplierName} ${p.breadcrumbs.join(" ")}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, limit);
  }

  // Slow path — hit our proxy (server will also start caching in the background)
  const response = await fetch(
    `/api/electrosales/products?query=${encodeURIComponent(query)}&limit=${limit}`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as { items?: ElectrosalesProduct[] };
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function fetchElectrosalesDepartments(): Promise<ElectrosalesDepartment[]> {
  const response = await fetch("/api/electrosales/departments", { method: "GET" });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items?: ElectrosalesDepartment[] };
  return Array.isArray(payload.items) ? payload.items : [];
}
