import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDictionary, isLocale, localePath } from '../../../../lib/i18n';
import { supabaseServer } from '../../../../lib/supabase/server';
import { isMember } from '../../../../lib/membership';
import type { PersonRow, ProfileRow } from '../../../../lib/people';
import { FREE_LEVELS, LEVEL_NAMES, lessonDef, lessonTitle } from '../../../../lib/learn';
import { lessonFor, loadProgress } from '../../../../lib/learn-server';
import LessonClient from '../../../../components/LessonClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; lesson: string }> }): Promise<Metadata> {
  const { lang, lesson } = await params;
  if (!isLocale(lang) || !lessonDef(lesson)) return {};
  return { title: `${lessonTitle(lesson, lang)} · AstrologyBird`, robots: { index: false } };
}

export default async function LessonPage({ params }: { params: Promise<{ lang: string; lesson: string }> }) {
  const { lang, lesson: id } = await params;
  if (!isLocale(lang)) notFound();
  const def = lessonDef(id);
  if (!def) notFound();
  const t = getDictionary(lang);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`${localePath(lang, '/login')}?next=${encodeURIComponent(localePath(lang, `/learn/${id}`))}`);

  const [{ data: profile }, { data: people }, member, progress] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle<ProfileRow>(),
    sb.from('people').select('*').order('created_at'),
    isMember(sb, user.id),
    loadProgress(sb),
  ]);

  const head = (
    <section className="hero">
      <div className="eyebrow">{t.learn.level.replace('{n}', String(def.level))} · {LEVEL_NAMES[lang].at(def.level - 1)}</div>
      <h1>{lessonTitle(id, lang)}</h1>
    </section>
  );

  if (def.level > FREE_LEVELS && !member) {
    return <main>{head}<div className="card con-empty"><p>{t.learn.memberOnly}</p><a className="btn" href={process.env.NEXT_PUBLIC_WAITLIST_URL ?? 'https://www.astrologybird.com/waitlist'}>{t.learn.joinInner}</a></div></main>;
  }
  if (!profile?.birth_date) {
    return <main>{head}<div className="card con-empty"><p>{t.learn.needProfile}</p><a className="btn" href={localePath(lang, '/account')}>{t.learn.toAccount}</a></div></main>;
  }
  const lesson = await lessonFor(id, lang, t, profile, (people as PersonRow[] | null) ?? [], member).catch(() => null);
  if (!lesson) return <main>{head}<p className="error con-center">{t.learn.error}</p></main>;

  return (
    <main>
      {head}
      <LessonClient
        lang={lang} t={t} lesson={lesson}
        done={progress.lessons.some((l) => l.lesson_id === id)}
        fronts={progress.unlocks.filter((u) => u.side === 'front').map((u) => u.card_id)}
        blacklights={progress.unlocks.filter((u) => u.side === 'blacklight').map((u) => u.card_id)}
      />
    </main>
  );
}
