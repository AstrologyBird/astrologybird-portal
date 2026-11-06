import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL } from './lib/supabase/config';

// English lives at the root ("/"), Dutch under "/nl". Internally every page
// sits under /[lang], so root paths are rewritten to /en. The Supabase session
// cookie is refreshed on every page request.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url);
  }

  let res: NextResponse;
  if (pathname === '/nl' || pathname.startsWith('/nl/')) {
    res = NextResponse.next({ request: req });
  } else {
    const url = req.nextUrl.clone();
    url.pathname = `/en${pathname === '/' ? '' : pathname}`;
    res = NextResponse.rewrite(url, { request: req });
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export const config = { matcher: ['/((?!api|auth|_next|favicon.ico|apple-touch-icon.png|logo.svg|.*\\..*).*)'] };
