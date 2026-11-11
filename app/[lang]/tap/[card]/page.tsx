import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, localePath } from '../../../../lib/i18n';
import { supabaseServer } from '../../../../lib/supabase/server';
import deck from '../../../../lib/oracle-deck.json';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

/**
 * Landing page for the chip / QR code in a physical deck card.
 * Shows the card and sends the reader on to Ask the Bird.
 */
export default async function TapPage({ params }: { params: Promise<{ lang: string; card: string }> }) {
  const { lang, card: id } = await params;
  if (!isLocale(lang)) notFound();
  const card = deck.find((c) => c.id === id);
  if (!card) notFound();
  const t = getDictionary(lang);
  const c = card[lang];
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.tap.title}</div>
        <h1>{c.name}: {c.title}</h1>
        <p className="lead">{user ? t.tap.lead : t.tap.signIn}</p>
      </section>
      <div className="tap-card">
        <div className="card drawn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/cards/${id}.jpg`} alt={c.name} />
          <div>
            <h3>{c.essence}</h3>
            <p>{c.message}</p>
            <p><em>{c.question}</em></p>
          </div>
        </div>
        <a className="btn" href={user ? localePath(lang, '/bird') : `${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, `/tap/${id}`))}`}>{user ? t.tap.ask : t.acct.loginTitle}</a>
      </div>
    </main>
  );
}
