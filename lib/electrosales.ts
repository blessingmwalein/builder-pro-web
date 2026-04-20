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
};

export type ElectrosalesDepartment = {
  id?: number | string;
  name?: string;
  label?: string;
};

export async function searchElectrosalesProducts(query: string, limit = 12): Promise<ElectrosalesProduct[]> {
  if (!query.trim()) return [];

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
