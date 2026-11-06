import { NextResponse, type NextRequest } from 'next/server';

// English lives at the root ("/"), Dutch under "/nl". Internally every page
// sits under /[lang], so root paths are rewritten to /en.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url);
  }
  if (pathname === '/nl' || pathname.startsWith('/nl/')) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|apple-touch-icon.png|logo.svg|.*\\..*).*)'] };
