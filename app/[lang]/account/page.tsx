import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDictionary, isLocale, localePath } from '../../../lib/i18n';
import { supabaseServer } from '../../../lib/supabase/server';
import type { PersonRow, ProfileRow } from '../../../lib/people';
import AccountClient from '../../../components/AccountClient';

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, '/account'))}`);

  const [{ data: profile }, { data: people }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('people').select('*').order('created_at'),
  ]);

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.acct.myAccount}</div>
        <h1>{t.acct.accountTitle}</h1>
        <p className="lead">{t.acct.signedInAs} {user.email}</p>
      </section>
      <AccountClient
        lang={lang}
        t={t}
        userId={user.id}
        initialProfile={(profile as ProfileRow | null) ?? { id: user.id, display_name: null, locale: lang, birth_date: null, birth_time: null, time_unknown: false, place_name: null, lat: null, lon: null, timezone: null, house_system: 'placidus', digest_opt_in: false, digest_hour: 7 }}
        initialPeople={(people as PersonRow[] | null) ?? []}
      />
    </main>
  );
}
