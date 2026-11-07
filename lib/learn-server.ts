// Server side of Learn From Your Own Sky: load progress and build a lesson from the user's charts.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Dictionary, Locale } from './i18n';
import type { PersonRow, ProfileRow } from './people';
import { natalChart, personChart, skyNow } from './sky';
import { FREE_CONSTELLATION } from './constellation';
import { buildLesson, lessonDef, type LessonView } from './learn';

export interface Unlock { card_id: string; side: 'front' | 'blacklight' }
export interface Progress { lessons: { lesson_id: string; completed_at: string }[]; unlocks: Unlock[] }

export async function loadProgress(sb: SupabaseClient): Promise<Progress> {
  const [{ data: lessons }, { data: unlocks }] = await Promise.all([
    sb.from('lesson_progress').select('lesson_id,completed_at'),
    sb.from('card_unlocks').select('card_id,side'),
  ]);
  return { lessons: lessons ?? [], unlocks: (unlocks as Unlock[] | null) ?? [] };
}

/** Build a lesson for this profile. People are only fetched for the lessons that use them. */
export async function lessonFor(id: string, lang: Locale, t: Dictionary, profile: ProfileRow, people: PersonRow[], member: boolean): Promise<LessonView | null> {
  const def = lessonDef(id);
  const natalP = natalChart(profile);
  if (!def || !natalP) return null;
  const needsSky = id === 'now';
  const needsPeople = def.level === 5;
  const shown = needsPeople ? (member ? people : people.slice(0, FREE_CONSTELLATION)).slice(0, 12) : [];
  const [natal, sky, ...charts] = await Promise.all([
    natalP,
    needsSky ? skyNow() : Promise.resolve(null),
    ...shown.map((p) => personChart(p, profile.house_system)),
  ]);
  return buildLesson(id, {
    lang, natal, sky,
    people: shown.map((p, i) => ({ name: p.name, chart: charts.at(i)! })),
    names: { points: t.points, signs: t.signs, aspects: t.aspects },
    birthDate: profile.birth_date!,
  });
}
