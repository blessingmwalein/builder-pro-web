import { NextResponse } from "next/server";

const ELECTROSALES_BASE_URL = "https://www.electrosales.co.zw:3000";

export async function GET() {
  try {
    const response = await fetch(`${ELECTROSALES_BASE_URL}/shop/getDepartments`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ items: [] });
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : [];
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
