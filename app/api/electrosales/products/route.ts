import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.electrosales.co.zw:3000";
const PAGE_LIMIT = 200;
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

type RawProduct = {
  id: number;
  name?: string;
  sku?: string;
  price?: number;
  priceExclVat?: number;
  availability?: string;
  st_ldesc?: string;
  brand?: { name?: string };
  images?: string[];
  breadcrumbs?: string[];
  uom?: string;
};

type PagePayload = {
  items?: RawProduct[];
  page?: number;
  total?: number;
  limit?: number;
  pages?: number;
};

export type NormalizedProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  priceExclVat: number;
  availability: string;
  supplierName: string;
  description: string;
  breadcrumbs: string[];
  imageUrl: string | null;
  uom: string;
};

// ─── Server-side in-memory cache ──────────────────────────────────────────────

const cache: {
  items: NormalizedProduct[];
  loadedAt: number;
  isComplete: boolean;
} = { items: [], loadedAt: 0, isComplete: false };

let loadingPromise: Promise<void> | null = null;

function isFresh(): boolean {
  return cache.items.length > 0 && Date.now() - cache.loadedAt < CACHE_TTL_MS;
}

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalize(p: RawProduct): NormalizedProduct {
  return {
    id: p.id,
    name: p.name || p.st_ldesc || "Unnamed product",
    sku: p.sku || "",
    price: typeof p.price === "number" ? p.price : 0,
    priceExclVat: typeof p.priceExclVat === "number" ? p.priceExclVat : 0,
    availability: p.availability || "unknown",
    supplierName: p.brand?.name || "Electrosales",
    description: p.st_ldesc || "",
    breadcrumbs: Array.isArray(p.breadcrumbs) ? p.breadcrumbs : [],
    imageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
    uom: p.uom || "EACH",
  };
}

async function fetchPage(page: number, limit: number): Promise<PagePayload | null> {
  const url = `${BASE}/shop/getProductsList?page=${page}&limit=${limit}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PagePayload;
    return Array.isArray(data.items) ? data : null;
  } catch {
    return null;
  }
}

// Background-loads all pages and seeds the module-level cache progressively.
function ensureCache(): void {
  if (loadingPromise || cache.isComplete) return;

  loadingPromise = (async () => {
    try {
      const first = await fetchPage(1, PAGE_LIMIT);
      if (!first?.items?.length) return;

      const all: NormalizedProduct[] = first.items.map(normalize);
      const totalPages = first.pages ?? Math.ceil((first.total ?? 0) / PAGE_LIMIT);

      // Seed cache immediately with page 1 so searches can start
      cache.items = [...all];
      cache.loadedAt = Date.now();

      // Load remaining pages in batches of 5 (parallel, 1 s between batches)
      for (let start = 2; start <= Math.min(totalPages, 80); start += 5) {
        const pages = Array.from({ length: 5 }, (_, i) => start + i).filter((p) => p <= Math.min(totalPages, 80));
        const batches = await Promise.all(
          pages.map((p) => fetchPage(p, PAGE_LIMIT).then((r) => r?.items?.map(normalize) ?? [])),
        );
        all.push(...batches.flat());
        cache.items = [...all];
        cache.loadedAt = Date.now();
      }

      cache.isComplete = true;
    } catch (err) {
      console.error("[Electrosales] Background load failed:", err);
    } finally {
      loadingPromise = null;
    }
  })();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10)));
  const wantsAll = searchParams.get("all") === "1";

  // Trigger background loading whenever cache is stale or empty
  if (!isFresh()) ensureCache();

  // ── Return entire cache (for browser pre-load) ──────────────────────────────
  if (wantsAll && cache.items.length > 0) {
    return NextResponse.json({
      items: cache.items,
      total: cache.items.length,
      complete: cache.isComplete,
      cached: true,
    });
  }

  // ── Filter from cache (fast path) ──────────────────────────────────────────
  if (cache.items.length > 0) {
    const filtered = query
      ? cache.items.filter((p) => {
          const hay = `${p.name} ${p.sku} ${p.description} ${p.supplierName} ${p.breadcrumbs.join(" ")}`.toLowerCase();
          return hay.includes(query);
        })
      : cache.items;

    return NextResponse.json({
      items: filtered.slice(0, limit),
      total: filtered.length,
      complete: cache.isComplete,
      cached: true,
    });
  }

  // ── Cache cold — hit API directly with search params ───────────────────────
  const candidateUrls = [
    `${BASE}/shop/getProductsList?page=1&limit=${limit}&search=${encodeURIComponent(query)}`,
    `${BASE}/shop/getProductsList?page=1&limit=${limit}&q=${encodeURIComponent(query)}`,
    `${BASE}/shop/getProductsList?page=1&limit=${limit}&keyword=${encodeURIComponent(query)}`,
    `${BASE}/shop/getProductsList?page=1&limit=${limit}`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as PagePayload;
      if (!Array.isArray(data.items)) continue;

      const items = data.items.map(normalize);
      const filtered = query
        ? items.filter((p) =>
            `${p.name} ${p.sku} ${p.description}`.toLowerCase().includes(query),
          )
        : items;

      return NextResponse.json({
        items: filtered.slice(0, limit),
        total: data.total ?? filtered.length,
        complete: false,
        cached: false,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ items: [], total: 0, complete: false, cached: false });
}
