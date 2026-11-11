import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDictionary, isLocale, localePath } from '../../../lib/i18n';
import { supabaseServer } from '../../../lib/supabase/server';
import ConstellationSky from '../../../components/ConstellationSky';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).con.metaTitle, robots: { index: false } };
}

export default async function ConstellationPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, '/constellation'))}`);
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.con.eyebrow}</div>
        <h1>{t.con.title}</h1>
        <p className="lead">{t.con.lead}</p>
      </section>
      <ConstellationSky lang={lang} t={t} />
    </main>
  );
}
