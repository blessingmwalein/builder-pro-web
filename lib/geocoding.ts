export type AddressResult = {
  label: string;
  lat: number;
  lng: number;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeGoogleResult(item: any): AddressResult | null {
  const lat = asNumber(item?.geometry?.location?.lat);
  const lng = asNumber(item?.geometry?.location?.lng);
  const label = typeof item?.formatted_address === "string" ? item.formatted_address : "";
  if (lat == null || lng == null || !label) return null;
  return { label, lat, lng };
}

function normalizeNominatimResult(item: any): AddressResult | null {
  const lat = asNumber(item?.lat);
  const lng = asNumber(item?.lon);
  const label = typeof item?.display_name === "string" ? item.display_name : "";
  if (lat == null || lng == null || !label) return null;
  return { label, lat, lng };
}

export async function searchAddresses(query: string): Promise<AddressResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (googleApiKey) {
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${googleApiKey}`;
    const response = await fetch(googleUrl);
    if (!response.ok) throw new Error("Failed to search address");
    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results
      .map(normalizeGoogleResult)
      .filter((item: AddressResult | null): item is AddressResult => item !== null)
      .slice(0, 6);
  }

  // Fallback for environments without Google API key.
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(trimmed)}`;
  const response = await fetch(nominatimUrl, {
    headers: { "Accept-Language": "en" },
  });
  if (!response.ok) throw new Error("Failed to search address");
  const data = await response.json();
  const results = Array.isArray(data) ? data : [];
  return results
    .map(normalizeNominatimResult)
    .filter((item: AddressResult | null): item is AddressResult => item !== null)
    .slice(0, 6);
}
