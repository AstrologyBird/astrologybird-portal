import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';

// Magic-link landing: exchange the one-time code for a session cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  const loginPath = safeNext.startsWith('/nl') ? '/nl/login' : '/login';
  return NextResponse.redirect(new URL(`${loginPath}?error=link`, url.origin));
}
