// Server side of Your Constellation: fetch every chart once, then build the sky.
import type { PersonRow, ProfileRow } from './people';
import { natalChart, personChart, skyNow } from './sky';
import { FREE_CONSTELLATION, buildSky, star, type Sky } from './constellation';

export async function loadSky(profile: ProfileRow, people: PersonRow[], member: boolean, youLabel: string): Promise<Sky | null> {
  const mineP = natalChart(profile);
  if (!mineP) return null;
  const shown = member ? people : people.slice(0, FREE_CONSTELLATION);
  const [mine, sky, ...theirs] = await Promise.all([
    mineP,
    skyNow().catch(() => null),
    ...shown.map((p) => personChart(p, profile.house_system)),
  ]);
  const entries = [
    { star: star('me', profile.display_name || youLabel, null, mine), chart: mine },
    ...shown.map((p, i) => ({ star: star(p.id, p.name, p.relation, theirs.at(i)!), chart: theirs.at(i)! })),
  ];
  return buildSky(entries, sky, people.length - shown.length, member);
}
