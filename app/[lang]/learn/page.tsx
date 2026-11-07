import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDictionary, isLocale, localePath } from '../../../lib/i18n';
import { supabaseServer } from '../../../lib/supabase/server';
import { isMember } from '../../../lib/membership';
import { LESSONS, lessonTitle, moonStreak } from '../../../lib/learn';
import { loadProgress } from '../../../lib/learn-server';
import LearnHome from '../../../components/LearnHome';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).learn.metaTitle, robots: { index: false } };
}

export default async function LearnPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, '/learn'))}`);
  const [progress, member, { data: profile }] = await Promise.all([
    loadProgress(sb), isMember(sb, user.id), sb.from('profiles').select('birth_date').eq('id', user.id).maybeSingle(),
  ]);
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.learn.eyebrow}</div>
        <h1>{t.learn.title}</h1>
        <p className="lead">{t.learn.lead}</p>
      </section>
      {!profile?.birth_date && (
        <div className="card con-empty" style={{ marginBottom: 24 }}><p>{t.learn.needProfile}</p><a className="btn btn-small" href={localePath(lang, '/account')}>{t.learn.toAccount}</a></div>
      )}
      <LearnHome lang={lang} t={t} data={{
        done: progress.lessons.map((l) => l.lesson_id),
        unlocks: progress.unlocks,
        member,
        streak: moonStreak(progress.lessons.map((l) => new Date(l.completed_at))),
        titles: Object.fromEntries(LESSONS.map((l) => [l.id, lessonTitle(l.id, lang)])),
      }} />
    </main>
  );
}
