import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005/api/v1';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('bp_access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const tenantSlug = request.cookies.get('bp_tenant_slug')?.value ?? '';

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${decodeURIComponent(token)}`,
        ...(tenantSlug ? { 'x-tenant-slug': decodeURIComponent(tenantSlug) } : {}),
      },
    });

    if (res.status === 402) {
      const data = await res.json().catch(() => null);
      const code = (data as { code?: string } | null)?.code ?? '';
      const dest = new URL('/subscription-expired', request.url);
      dest.searchParams.set('reason', code);
      return NextResponse.redirect(dest);
    }

    if (res.status === 401) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch {
    // Network/edge error — pass through; client-side will handle it
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/tasks/:path*',
    '/crm/:path*',
    '/documents/:path*',
    '/employees/:path*',
    '/financials/:path*',
    '/invoices/:path*',
    '/materials/:path*',
    '/messaging/:path*',
    '/quotes/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/time-tracking/:path*',
  ],
};
