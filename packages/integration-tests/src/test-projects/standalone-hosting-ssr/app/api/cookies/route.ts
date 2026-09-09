import { NextResponse } from 'next/server';

// Three Set-Cookie headers in one response. Verifies CloudFront → API Gateway
// → Lambda doesn't collapse them into a single comma-joined value.

export const dynamic = 'force-dynamic';

export function GET() {
  const res = NextResponse.json({ ok: true, cookies: 3 });
  res.cookies.set('a', '1', { path: '/' });
  res.cookies.set('b', '2', { path: '/', httpOnly: true });
  res.cookies.set('c', '3', { path: '/', sameSite: 'lax', secure: true });
  return res;
}
