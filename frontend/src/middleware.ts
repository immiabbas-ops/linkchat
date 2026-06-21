import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_HOST = (process.env.NEXT_PUBLIC_APP_URL || 'https://link-chats.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] || '';
  const proto = request.headers.get('x-forwarded-proto');
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  // Only redirect when we know the request was plain HTTP (set by nginx). Missing header = do not redirect.
  if (isLocal || proto !== 'http') return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);

  if (isIp || (host !== APP_HOST && !host.endsWith(`.${APP_HOST}`))) {
    return NextResponse.redirect(`https://${APP_HOST}${pathname}${search}`, 308);
  }

  return NextResponse.redirect(`https://${host}${pathname}${search}`, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
