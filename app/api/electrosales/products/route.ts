import { NextRequest, NextResponse } from "next/server";

const ELECTROSALES_BASE_URL = "https://www.electrosales.co.zw:3000";

type RawProduct = {
  id: number;
  name: string;
  sku?: string;
  price?: number;
  priceExclVat?: number;
  availability?: string;
  st_ldesc?: string;
  brand?: { name?: string };
  breadcrumbs?: string[];
};

type ProductsPayload = {
  items?: RawProduct[];
  page?: number;
  total?: number;
  limit?: number;
};

function normalizeProduct(product: RawProduct) {
  return {
    id: product.id,
    name: product.name || product.st_ldesc || "Unnamed product",
    sku: product.sku || "",
    price: typeof product.price === "number" ? product.price : 0,
    priceExclVat: typeof product.priceExclVat === "number" ? product.priceExclVat : 0,
    availability: product.availability || "unknown",
    supplierName: product.brand?.name || "Electrosales",
    description: product.st_ldesc || "",
    breadcrumbs: Array.isArray(product.breadcrumbs) ? product.breadcrumbs : [],
  };
}

async function fetchProductsWithParams(
  page: number,
  limit: number,
  query: string,
): Promise<ProductsPayload | null> {
  const candidateUrls = [
    `${ELECTROSALES_BASE_URL}/shop/getProductsList?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`,
    `${ELECTROSALES_BASE_URL}/shop/getProductsList?page=${page}&limit=${limit}&q=${encodeURIComponent(query)}`,
    `${ELECTROSALES_BASE_URL}/shop/getProductsList?page=${page}&limit=${limit}&keyword=${encodeURIComponent(query)}`,
    `${ELECTROSALES_BASE_URL}/shop/getProductsList?page=${page}&limit=${limit}`,
  ];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) continue;

      const payload = (await response.json()) as ProductsPayload;
      if (Array.isArray(payload.items)) {
        return payload;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(30, Math.max(1, Number.parseInt(searchParams.get("limit") || "12", 10)));

  const payload = await fetchProductsWithParams(page, limit, query);
  if (!payload || !Array.isArray(payload.items)) {
    return NextResponse.json({ items: [], page, total: 0, limit });
  }

  const sourceItems = payload.items;
  const filtered = query
    ? sourceItems.filter((item) => {
        const haystack = `${item.name || ""} ${item.sku || ""} ${item.st_ldesc || ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : sourceItems;

  return NextResponse.json({
    items: filtered.map(normalizeProduct),
    page: payload.page ?? page,
    total: payload.total ?? filtered.length,
    limit: payload.limit ?? limit,
  });
}
