import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware auth strategy:
 *
 * We intentionally do NOT validate the JWT here or call /auth/me.
 * Reasons:
 *   - Calling the API on every navigation adds latency and can cause false
 *     logouts when the token has just expired (even though the refresh token
 *     is still valid and api.ts would have recovered transparently).
 *   - Real token validation happens client-side: api.ts automatically retries
 *     with a refreshed token on 401, and store/provider.tsx calls fetchMe()
 *     on mount so the Redux state is always consistent.
 *
 * Middleware responsibility: gate completely unauthenticated users (no tokens
 * at all) so they never see a flash of protected UI.
 *
 * Decision tree:
 *   access-token cookie present     → pass through (JWT may be live or expired;
 *                                     client handles the 401 → refresh cycle)
 *   refresh-token cookie present    → pass through (client will refresh on first
 *                                     API call that returns 401)
 *   neither cookie present          → redirect to /login
 */

export function middleware(request: NextRequest) {
  const hasAccess  = Boolean(request.cookies.get('bp_access_token')?.value);
  const hasRefresh = Boolean(request.cookies.get('bp_refresh_token')?.value);

  if (hasAccess || hasRefresh) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
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
