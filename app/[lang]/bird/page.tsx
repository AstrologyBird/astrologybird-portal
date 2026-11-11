import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDictionary, isLocale, localePath } from '../../../lib/i18n';
import { supabaseServer } from '../../../lib/supabase/server';
import BirdChat from '../../../components/BirdChat';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).bird.metaTitle, robots: { index: false } };
}

export default async function BirdPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, '/bird'))}`);
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.bird.eyebrow}</div>
        <h1>{t.bird.title}</h1>
        <p className="lead">{t.bird.lead}</p>
      </section>
      <BirdChat lang={lang} t={t} waitlistUrl={process.env.NEXT_PUBLIC_WAITLIST_URL ?? 'https://www.astrologybird.com/waitlist'} />
    </main>
  );
}
