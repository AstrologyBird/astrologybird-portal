import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  const lang = new URL(req.url).searchParams.get('lang') === 'nl' ? '/nl' : '/';
  return NextResponse.redirect(new URL(lang, req.url), { status: 303 });
}
