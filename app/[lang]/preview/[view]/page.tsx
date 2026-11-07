// Local preview with sample people, for design work without signing in.
// Never available in production.
import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '../../../../lib/i18n';
import type { PersonRow, ProfileRow } from '../../../../lib/people';
import { loadSky } from '../../../../lib/constellation-server';
import { LESSONS, lessonDef, lessonTitle } from '../../../../lib/learn';
import { lessonFor } from '../../../../lib/learn-server';
import ConstellationSky from '../../../../components/ConstellationSky';
import LearnHome from '../../../../components/LearnHome';
import LessonClient from '../../../../components/LessonClient';

export const dynamic = 'force-dynamic';

const PROFILE: ProfileRow = {
  id: 'preview', display_name: null, locale: 'en', birth_date: '1994-08-17', birth_time: '23:10', time_unknown: false,
  place_name: 'Amsterdam', lat: 52.37, lon: 4.9, timezone: 'Europe/Amsterdam', house_system: 'placidus', digest_opt_in: false, digest_hour: 7,
};
const person = (id: string, name: string, relation: string, birth_date: string, birth_time: string | null, place_name: string, lat: number, lon: number, timezone: string): PersonRow =>
  ({ id, name, relation, birth_date, birth_time, time_unknown: birth_time === null, place_name, lat, lon, timezone });
const PEOPLE: PersonRow[] = [
  person('p1', 'Sam', 'partner', '1992-02-03', '07:45', 'Utrecht', 52.09, 5.12, 'Europe/Amsterdam'),
  person('p2', 'Noor', 'best friend', '1995-11-21', '14:20', 'Rotterdam', 51.92, 4.48, 'Europe/Amsterdam'),
  person('p3', 'Mila', 'sister', '1998-05-09', null, 'Amsterdam', 52.37, 4.9, 'Europe/Amsterdam'),
  person('p4', 'Jules', 'ex', '1993-07-28', '02:05', 'Antwerp', 51.22, 4.4, 'Europe/Brussels'),
  person('p5', 'Robin', 'mother', '1966-03-14', '10:30', 'Groningen', 53.22, 6.57, 'Europe/Amsterdam'),
];

export default async function Preview({ params }: { params: Promise<{ lang: string; view: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { lang, view } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  if (view === 'constellation') {
    const sky = await loadSky(PROFILE, PEOPLE, false, t.con.you);
    return <main><section className="hero"><div className="eyebrow">{t.con.eyebrow}</div><h1>{t.con.title}</h1><p className="lead">{t.con.lead}</p></section><ConstellationSky lang={lang} t={t} initial={sky!} /></main>;
  }
  if (view === 'learn') {
    const unlocks = [
      ...['sun', 'leo', 'moon', 'gemini', 'taurus', 'mercury', 'venus', 'libra'].map((card_id) => ({ card_id, side: 'front' as const })),
      ...['sun', 'moon', 'venus'].map((card_id) => ({ card_id, side: 'blacklight' as const })),
    ];
    return <main><section className="hero"><div className="eyebrow">{t.learn.eyebrow}</div><h1>{t.learn.title}</h1><p className="lead">{t.learn.lead}</p></section>
      <LearnHome lang={lang} t={t} data={{ done: ['sun', 'moon', 'rising', 'mercury', 'venus'], unlocks, member: false, streak: 3, titles: Object.fromEntries(LESSONS.map((l) => [l.id, lessonTitle(l.id, lang)])) }} />
</main>;
  }
  if (view.startsWith('lesson-')) {
    const id = view.slice(7);
    const def = lessonDef(id);
    if (!def) notFound();
    const lesson = await lessonFor(id, lang, t, PROFILE, PEOPLE, true);
    if (!lesson) notFound();
    return <main><section className="hero"><div className="eyebrow">{t.learn.level.replace('{n}', String(def.level))}</div><h1>{lesson.title}</h1></section>
      <LessonClient lang={lang} t={t} lesson={lesson} done={view.endsWith('venus')} fronts={view.endsWith('venus') ? lesson.cards : []} blacklights={[]} /></main>;
  }
  notFound();
}
