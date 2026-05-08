import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rewrite: /old-path is transparently served as if it were the home page
  if (pathname === '/old-path') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const response = NextResponse.rewrite(url);
    response.headers.set('x-middleware-rewrite', '/rewritten-from-old-path');
    return response;
  }

  // Redirect: /legacy-about permanently redirects to /about
  if (pathname === '/legacy-about') {
    const url = request.nextUrl.clone();
    url.pathname = '/about';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/old-path', '/legacy-about'],
};
