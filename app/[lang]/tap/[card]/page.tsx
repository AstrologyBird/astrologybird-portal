import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, localePath } from '../../../../lib/i18n';
import { supabaseServer } from '../../../../lib/supabase/server';
import { cardById } from '../../../../lib/learn';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

/**
 * Landing page for the chip / QR code in a physical deck card.
 * Signed in: the card's front goes into the deck and the card's bonus lesson shows.
 */
export default async function TapPage({ params }: { params: Promise<{ lang: string; card: string }> }) {
  const { lang, card: id } = await params;
  if (!isLocale(lang)) notFound();
  const card = cardById(id);
  if (!card) notFound();
  const t = getDictionary(lang);
  const c = card[lang];
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    await sb.from('card_unlocks').upsert({ owner_id: user.id, card_id: id, side: 'front', source: 'tap' }, { onConflict: 'owner_id,card_id,side', ignoreDuplicates: true });
  }
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.learn.tapTitle}</div>
        <h1>{c.name}: {c.title}</h1>
        <p className="lead">{user ? t.learn.tapLead : t.learn.tapSignIn}</p>
      </section>
      <div className="lesson">
        <div className="card drawn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/cards/${id}.jpg`} alt={c.name} />
          <div>
            <h3>{c.essence}</h3>
            <p>{c.message}</p>
            <p><em>{c.question}</em></p>
          </div>
        </div>
        <a className="btn" href={user ? localePath(lang, '/learn') : `${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, `/tap/${id}`))}`}>{user ? t.learn.toLearn : t.acct.loginTitle}</a>
      </div>
    </main>
  );
}
