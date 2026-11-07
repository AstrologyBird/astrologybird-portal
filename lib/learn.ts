// Learn From Your Own Sky: seven levels of short lessons, each built from the learner's own chart.
// Every lesson unlocks cards of the AstrologyBird deck; a private shadow question turns a card
// to its Black Light side. The collection (26 cards x 2 sides = 52 faces) is the progress bar.
import type { Chart, PointKey, Position, SignKey } from './chart-types';
import type { Locale } from './i18n';
import { contacts } from './constellation';
import { personalTransits } from './sky';
import deck from './oracle-deck.json';

export type Card = (typeof deck)[number];
export const CARDS: Card[] = deck;
export const cardById = (id: string) => CARDS.find((c) => c.id === id);
export const TOTAL_FACES = CARDS.length * 2;

/** Levels 1 and 2 are free; 3 to 6 need Inner Circle; 7 is the Bird Certified track. */
export const FREE_LEVELS = 2;

export interface LessonDef { id: string; level: number }

export const LESSONS: LessonDef[] = [
  { id: 'sun', level: 1 }, { id: 'moon', level: 1 }, { id: 'rising', level: 1 },
  { id: 'mercury', level: 2 }, { id: 'venus', level: 2 }, { id: 'mars', level: 2 }, { id: 'jupiter', level: 2 },
  { id: 'saturn', level: 2 }, { id: 'outer', level: 2 }, { id: 'houses', level: 2 },
  { id: 'harmony', level: 3 }, { id: 'tension', level: 3 }, { id: 'conjunctions', level: 3 },
  { id: 'now', level: 4 }, { id: 'returns', level: 4 },
  { id: 'people', level: 5 }, { id: 'pair', level: 5 },
  { id: 'chiron', level: 6 }, { id: 'lilith', level: 6 }, { id: 'nodes', level: 6 },
  { id: 'fire', level: 7 }, { id: 'earth', level: 7 }, { id: 'air', level: 7 }, { id: 'water', level: 7 }, { id: 'certified', level: 7 },
];
export const lessonDef = (id: string) => LESSONS.find((l) => l.id === id);

export const LEVEL_NAMES: Record<Locale, string[]> = {
  en: ['Your Big Three', 'Planets and houses', 'Aspects', 'Transits', 'Your people', 'Black Light', 'Bird Certified'],
  nl: ['Je Big Three', 'Planeten en huizen', 'Aspecten', 'Transits', 'Jouw mensen', 'Black Light', 'Bird Certified'],
};

type Text = Record<Locale, string>;
const TITLE: Record<string, Text> = {
  sun: { en: 'Your Sun: who you are becoming', nl: 'Je Zon: wie je aan het worden bent' },
  moon: { en: 'Your Moon: what you need at 11pm', nl: "Je Maan: wat je om 11 uur 's avonds nodig hebt" },
  rising: { en: 'Your Rising sign: the door people walk through', nl: 'Je Ascendant: de deur waar mensen doorheen lopen' },
  mercury: { en: 'Mercury: how your mind talks', nl: 'Mercurius: hoe je hoofd praat' },
  venus: { en: 'Venus: how you love', nl: 'Venus: hoe je liefhebt' },
  mars: { en: 'Mars: how you want, fight and go', nl: 'Mars: hoe je wilt, vecht en gaat' },
  jupiter: { en: 'Jupiter: where life opens up', nl: 'Jupiter: waar het leven opengaat' },
  saturn: { en: 'Saturn: your strictest teacher', nl: 'Saturnus: je strengste leraar' },
  outer: { en: "Uranus, Neptune, Pluto: your generation's weather", nl: 'Uranus, Neptunus, Pluto: het weer van je generatie' },
  houses: { en: 'The houses: where life happens', nl: 'De huizen: waar het leven gebeurt' },
  harmony: { en: 'Your easy gifts: trines and sextiles', nl: 'Je makkelijke gaven: driehoeken en sextielen' },
  tension: { en: 'Your inner friction: squares and oppositions', nl: 'Je innerlijke wrijving: vierkanten en opposities' },
  conjunctions: { en: 'Where planets merge: conjunctions', nl: 'Waar planeten samensmelten: conjuncties' },
  now: { en: 'What is moving in your sky right now', nl: 'Wat er nu beweegt in jouw hemel' },
  returns: { en: 'Your big returns', nl: 'Je grote terugkeermomenten' },
  people: { en: 'What your people bring to your deck', nl: 'Wat jouw mensen meebrengen in je deck' },
  pair: { en: 'Reading a synastry', nl: 'Een synastrie lezen' },
  chiron: { en: 'Chiron: the wound that teaches', nl: 'Chiron: de wond die lesgeeft' },
  lilith: { en: 'Lilith: the part you were told to hide', nl: 'Lilith: het deel dat je moest verstoppen' },
  nodes: { en: 'The lunar nodes: where you come from, where you go', nl: 'De maanknopen: waar je vandaan komt, waar je heen gaat' },
  fire: { en: 'The fire signs', nl: 'De vuurtekens' },
  earth: { en: 'The earth signs', nl: 'De aardetekens' },
  air: { en: 'The air signs', nl: 'De luchttekens' },
  water: { en: 'The water signs', nl: 'De watertekens' },
  certified: { en: 'Becoming Bird Certified', nl: 'Bird Certified worden' },
};

const INTRO: Record<string, Text> = {
  sun: { en: "The Sun is the core of your chart: the light you are here to grow into. It isn't everything you are, but it's what makes you feel most alive when you live it.", nl: 'De Zon is de kern van je kaart: het licht waar je naartoe groeit. Het is niet alles wat je bent, maar wel wat je het meest levend laat voelen als je het leeft.' },
  moon: { en: "The Moon is your inner weather: what calms you, and what you reach for when the day is over and nobody's watching. Knowing your Moon is knowing how to take care of yourself.", nl: 'De Maan is je innerlijke weer: wat je kalmeert, en waar je naar grijpt als de dag voorbij is en niemand kijkt. Je Maan kennen is weten hoe je voor jezelf zorgt.' },
  rising: { en: 'Your Rising sign (the Ascendant) was coming up on the eastern horizon when you were born. It is your first impression, your way of meeting life, and the lens your whole chart looks through.', nl: 'Je Ascendant kwam op aan de oostelijke horizon toen je werd geboren. Het is je eerste indruk, je manier om het leven tegemoet te gaan, en de lens waardoor je hele kaart kijkt.' },
  mercury: { en: 'Mercury shows how you think, learn and speak: the voice in your head and the way it reaches other people.', nl: 'Mercurius laat zien hoe je denkt, leert en praat: de stem in je hoofd en hoe die bij anderen aankomt.' },
  venus: { en: "Venus is what you're drawn to, in love, beauty and pleasure. It also shows what makes you feel worth something.", nl: 'Venus is waar je naartoe getrokken wordt, in liefde, schoonheid en genot. Ze laat ook zien waardoor je je waardevol voelt.' },
  mars: { en: 'Mars is your drive: how you go after what you want, how you get angry, and what gets you out of bed.', nl: 'Mars is je drive: hoe je achter iets aan gaat, hoe je boos wordt en wat je uit bed krijgt.' },
  jupiter: { en: 'Jupiter shows where you grow, trust and find meaning: the place where luck tends to find you once you say yes.', nl: 'Jupiter laat zien waar je groeit, vertrouwt en betekenis vindt: de plek waar geluk je vindt zodra je ja zegt.' },
  saturn: { en: 'Saturn is where life asks for patience and structure. At first it feels like a wall; later it becomes your foundation.', nl: 'Saturnus is waar het leven geduld en structuur van je vraagt. Eerst voelt het als een muur, later wordt het je fundament.' },
  outer: { en: 'The outer planets move slowly, so everyone born around your time shares their signs. Their house in your chart is what makes them personal.', nl: 'De buitenplaneten bewegen langzaam, dus iedereen die rond jouw tijd is geboren deelt hun tekens. Hun huis in jouw kaart maakt ze persoonlijk.' },
  houses: { en: 'If the planets are the actors and the signs their costumes, the houses are the stage: twelve areas of life, from home to work to love.', nl: 'Als de planeten de acteurs zijn en de tekens hun kostuums, dan zijn de huizen het podium: twaalf levensgebieden, van thuis tot werk tot liefde.' },
  harmony: { en: 'Trines (120°) and sextiles (60°) connect planets that understand each other. These are the gifts that come easily, sometimes so easily that you forget to use them.', nl: 'Driehoeken (120°) en sextielen (60°) verbinden planeten die elkaar begrijpen. Dit zijn de gaven die makkelijk gaan, soms zo makkelijk dat je vergeet ze te gebruiken.' },
  tension: { en: "Squares (90°) and oppositions (180°) connect planets that want different things. They rub, and that friction is the engine of most of what you'll ever build.", nl: 'Vierkanten (90°) en opposities (180°) verbinden planeten die iets anders willen. Ze schuren, en die wrijving is de motor van bijna alles wat je ooit zult bouwen.' },
  conjunctions: { en: 'A conjunction is two planets in nearly the same place. They act as one, for better and for worse, and you rarely notice where one ends and the other begins.', nl: 'Een conjunctie is twee planeten op bijna dezelfde plek. Ze werken als één, ten goede en ten kwade, en je merkt zelden waar de ene ophoudt en de andere begint.' },
  now: { en: 'A transit is a planet in today\'s sky touching a point in your birth chart. This is how astrology talks about timing: not what will happen, but what is being stirred.', nl: 'Een transit is een planeet in de lucht van vandaag die een punt in je geboortekaart raakt. Zo praat astrologie over timing: niet wat er gebeurt, maar wat er in beweging komt.' },
  returns: { en: 'Some planets come back to the exact place they held when you were born. Those returns mark chapters: Jupiter about every 12 years, Saturn around 29 and 59, Chiron around 50.', nl: 'Sommige planeten keren terug naar precies de plek waar ze stonden toen je werd geboren. Die terugkeer markeert hoofdstukken: Jupiter ongeveer elke 12 jaar, Saturnus rond 29 en 59, Chiron rond 50.' },
  people: { en: 'Every person in your constellation carries their own signs. Their Sun sign becomes a card in your deck, because you learn a sign best through someone you love.', nl: 'Iedereen in je constellatie draagt eigen tekens. Hun Zonneteken wordt een kaart in jouw deck, want je leert een teken het best kennen via iemand van wie je houdt.' },
  pair: { en: "Synastry lays two charts over each other. You read it by looking at the strongest contacts first: whose planet touches whose, and whether it flows or rubs.", nl: 'Synastrie legt twee kaarten over elkaar. Je leest het door eerst naar de sterkste contacten te kijken: wiens planeet raakt wiens planeet, en stroomt het of schuurt het.' },
  chiron: { en: 'Chiron is the wounded healer: the place where you were hurt early, and where you later become wise for others.', nl: 'Chiron is de gewonde genezer: de plek waar je vroeg gekwetst bent, en waar je later wijs wordt voor anderen.' },
  lilith: { en: 'Black Moon Lilith is the part of you that would not be tamed: desire, anger, wildness. It is where you were told you were too much.', nl: 'Black Moon Lilith is het deel van jou dat zich niet liet temmen: verlangen, woede, wildheid. Het is waar je te horen kreeg dat je te veel was.' },
  nodes: { en: 'The South Node is the comfortable road you already know; the North Node is the direction that makes you grow, and usually scares you a little.', nl: 'De Zuidknoop is de comfortabele weg die je al kent; de Noordknoop is de richting waarin je groeit, en die je meestal een beetje bang maakt.' },
  fire: { en: 'Fire signs act: Aries starts, Leo shines, Sagittarius seeks. To read them for someone else, ask what makes them come alive.', nl: 'Vuurtekens handelen: Ram begint, Leeuw straalt, Boogschutter zoekt. Om ze voor een ander te lezen, vraag je wat iemand tot leven brengt.' },
  earth: { en: 'Earth signs build: Taurus keeps, Virgo refines, Capricorn climbs. To read them for someone else, ask what they are making real.', nl: 'Aardetekens bouwen: Stier bewaart, Maagd verfijnt, Steenbok klimt. Om ze voor een ander te lezen, vraag je wat iemand echt aan het maken is.' },
  air: { en: 'Air signs connect: Gemini asks, Libra balances, Aquarius imagines. To read them for someone else, ask what they need to understand.', nl: 'Luchttekens verbinden: Tweelingen vraagt, Weegschaal weegt af, Waterman verbeeldt. Om ze voor een ander te lezen, vraag je wat iemand wil begrijpen.' },
  water: { en: 'Water signs feel: Cancer holds, Scorpio dives, Pisces dissolves. To read them for someone else, ask what they have not said yet.', nl: 'Watertekens voelen: Kreeft houdt vast, Schorpioen duikt, Vissen lost op. Om ze voor een ander te lezen, vraag je wat iemand nog niet heeft gezegd.' },
  certified: { en: 'Bird Certified is for people who want to read for others with this deck. You need all 52 faces of your deck unlocked, then you do supervised practice readings with our reviewers.', nl: 'Bird Certified is voor wie met dit deck voor anderen wil lezen. Je hebt alle 52 kanten van je deck ontgrendeld nodig, daarna doe je oefenreadings onder begeleiding van onze reviewers.' },
};

const HOUSE: Record<Locale, string[]> = {
  en: ['self and how you start things', 'money, body and what you value', 'words, siblings and your street', 'home, family and roots', 'joy, creativity and romance', 'daily work, health and rituals', 'partners and close relationships', 'intimacy, shared things and what changes you', 'travel, belief and big ideas', 'calling, career and public life', 'friends, groups and the future', 'the hidden, rest and the inner world'],
  nl: ['jezelf en hoe je dingen begint', 'geld, lichaam en wat je waardeert', 'woorden, broers en zussen, je buurt', 'thuis, familie en wortels', 'plezier, creativiteit en romantiek', 'dagelijks werk, gezondheid en rituelen', 'partners en hechte relaties', 'intimiteit, wat je deelt en wat je verandert', 'reizen, geloof en grote ideeën', 'roeping, carrière en publiek leven', 'vrienden, groepen en de toekomst', 'het verborgene, rust en je binnenwereld'],
};

const CARD_OF: Partial<Record<PointKey, string>> = {
  sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus', mars: 'mars', jupiter: 'jupiter', saturn: 'saturn',
  uranus: 'uranus', neptune: 'neptune', pluto: 'pluto', chiron: 'chiron', lilith: 'lilith', northNode: 'north-node', southNode: 'south-node',
};

const ELEMENT_SIGNS: Record<string, SignKey[]> = {
  fire: ['aries', 'leo', 'sagittarius'], earth: ['taurus', 'virgo', 'capricorn'],
  air: ['gemini', 'libra', 'aquarius'], water: ['cancer', 'scorpio', 'pisces'],
};

export interface LessonContext {
  lang: Locale;
  natal: Chart;
  sky?: Chart | null;
  people?: { name: string; chart: Chart }[];
  names: { points: Record<string, string>; signs: Record<string, string>; aspects: Record<string, string> };
  birthDate: string;
}

export interface LessonView {
  id: string;
  level: number;
  title: string;
  intro: string;
  sections: { heading: string; lines: string[] }[];
  cards: string[];          // card ids this lesson unlocks (front side)
  question: string | null;  // a question to sit with, from the main card
}

const W = { en: { in: 'in', house: 'house', yours: 'You', none: 'Nothing tight right now.', needTime: 'Your Rising sign needs your birth time. Add it in your account to unlock this card.', addPeople: 'Add people to your constellation to unlock their cards.', age: 'around age', year: 'around', certifiedNext: 'Unlock all 52 faces, then apply. The certification track (EUR 149) opens in 2027.' },
  nl: { in: 'in', house: 'huis', yours: 'Jij', none: 'Nu niets dat exact raakt.', needTime: 'Je Ascendant heeft je geboortetijd nodig. Vul die in bij je account om deze kaart te ontgrendelen.', addPeople: 'Voeg mensen toe aan je constellatie om hun kaarten te ontgrendelen.', age: 'rond je', year: 'rond', certifiedNext: 'Ontgrendel alle 52 kanten en meld je dan aan. Het certificeringstraject (EUR 149) opent in 2027.' } };

function placement(p: Position, ctx: LessonContext): { heading: string; lines: string[] } {
  const w = W[ctx.lang];
  const card = cardById(p.sign)!;
  const c = card[ctx.lang];
  const house = p.house ? ` · ${w.house} ${p.house}` : '';
  const lines = [`${c.title}. ${c.essence}`, c.keywords.join(' · ')];
  if (p.house) lines.push(`${ctx.names.points[p.key] ?? ''} ${w.in} ${w.house} ${p.house}: ${HOUSE[ctx.lang].at(p.house - 1)}.`);
  return { heading: `${ctx.names.points[p.key] ?? p.key} ${w.in} ${ctx.names.signs[p.sign]} ${p.degree}°${house}`, lines };
}

const point = (c: Chart, k: PointKey) => c.points.find((p) => p.key === k);
const aspectLine = (a: { a: PointKey; b: PointKey; type: string; orb: number }, ctx: LessonContext) =>
  `${ctx.names.points[a.a]} ${ctx.names.aspects[a.type] ?? a.type} ${ctx.names.points[a.b]} (orb ${a.orb.toFixed(1)}°)`;

/** Build one lesson for one person. Returns null for an unknown lesson id. */
export function buildLesson(id: string, ctx: LessonContext): LessonView | null {
  const def = lessonDef(id);
  if (!def) return null;
  const w = W[ctx.lang];
  const n = ctx.natal;
  const base = { id, level: def.level, title: TITLE[id][ctx.lang], intro: INTRO[id][ctx.lang] };
  const sections: LessonView['sections'] = [];
  const cards: string[] = [];
  let main: string | null = null;

  const planetLesson = (keys: PointKey[]) => {
    for (const k of keys) {
      const p = point(n, k);
      if (!p) continue;
      sections.push(placement(p, ctx));
      if (CARD_OF[k]) cards.push(CARD_OF[k]!);
      cards.push(p.sign);
    }
    main = CARD_OF[keys[0]] ?? null;
  };

  switch (id) {
    case 'sun': case 'moon': case 'mercury': case 'venus': case 'mars': case 'jupiter': case 'saturn':
      planetLesson([id as PointKey]); break;
    case 'outer': planetLesson(['uranus', 'neptune', 'pluto']); break;
    case 'chiron': planetLesson(['chiron']); break;
    case 'lilith': planetLesson(['lilith']); break;
    case 'nodes': planetLesson(['northNode', 'southNode']); break;
    case 'rising': {
      const asc = n.angles?.asc;
      if (asc) { sections.push(placement({ ...asc, key: 'asc' }, ctx)); cards.push(asc.sign); main = asc.sign; }
      else sections.push({ heading: ctx.names.points.asc, lines: [w.needTime] });
      break;
    }
    case 'houses': {
      const lines = (['sun', 'moon', 'venus', 'mars'] as PointKey[]).map((k) => point(n, k)).filter((p) => p?.house)
        .map((p) => `${ctx.names.points[p!.key]} ${w.in} ${w.house} ${p!.house}: ${HOUSE[ctx.lang].at(p!.house! - 1)}.`);
      sections.push({ heading: TITLE.houses[ctx.lang], lines: lines.length ? lines : [w.needTime] });
      sections.push({ heading: '1–12', lines: HOUSE[ctx.lang].map((h, i) => `${i + 1}. ${h}`) });
      break;
    }
    case 'harmony': case 'tension': case 'conjunctions': {
      const types = id === 'harmony' ? ['trine', 'sextile'] : id === 'tension' ? ['square', 'opposition'] : ['conjunction'];
      const list = n.aspects.filter((a) => types.includes(a.type)).sort((a, b) => a.orb - b.orb).slice(0, 4);
      sections.push({ heading: TITLE[id][ctx.lang], lines: list.length ? list.map((a) => aspectLine(a, ctx)) : [w.none] });
      const top = list.at(0);
      if (top && CARD_OF[top.a]) { cards.push(CARD_OF[top.a]!); main = CARD_OF[top.a]!; }
      break;
    }
    case 'now': {
      const sky = ctx.sky;
      if (sky) {
        const ts = personalTransits(sky, n, 5);
        sections.push({ heading: TITLE.now[ctx.lang], lines: ts.length ? ts.map((t) => `${ctx.names.points[t.transiting]} ${ctx.names.aspects[t.type]} ${ctx.names.points[t.natal]} (orb ${t.orb}°)`) : [w.none] });
        for (const k of ['jupiter', 'saturn'] as PointKey[]) { const p = point(sky, k); if (p) cards.push(p.sign); }
        main = cards.at(0) ?? null;
      }
      break;
    }
    case 'returns': {
      const born = Number(ctx.birthDate.slice(0, 4));
      const lines = [
        ...[1, 2, 3, 4, 5, 6].map((i) => Math.round(11.86 * i)).filter((a) => born + a >= new Date().getUTCFullYear()).slice(0, 2)
          .map((a) => `${ctx.names.points.jupiter}: ${w.age} ${a} (${w.year} ${born + a})`),
        ...[29.5, 59].map((a) => `${ctx.names.points.saturn}: ${w.age} ${Math.round(a)} (${w.year} ${born + Math.round(a)})`),
        `${ctx.names.points.chiron}: ${w.age} 50 (${w.year} ${born + 50})`,
      ];
      sections.push({ heading: TITLE.returns[ctx.lang], lines });
      break;
    }
    case 'people': case 'pair': {
      const people = ctx.people ?? [];
      if (!people.length) { sections.push({ heading: TITLE[id][ctx.lang], lines: [w.addPeople] }); break; }
      if (id === 'people') {
        sections.push({ heading: TITLE.people[ctx.lang], lines: people.map((p) => `${p.name}: ${ctx.names.signs[p.chart.bigThree.sun]} · ${cardById(p.chart.bigThree.sun)![ctx.lang].title}`) });
        for (const p of people) cards.push(p.chart.bigThree.sun);
      } else {
        const best = people.map((p) => ({ p, c: contacts(n, p.chart) })).sort((x, y) => y.c.length - x.c.length).at(0)!;
        sections.push({ heading: `${w.yours} × ${best.p.name}`, lines: best.c.slice(0, 5).map((c) => `${w.yours}: ${ctx.names.points[c.a]} · ${ctx.names.aspects[c.type]} · ${best.p.name}: ${ctx.names.points[c.b]}`) });
        for (const p of people) cards.push(p.chart.bigThree.moon);
      }
      main = cards.at(0) ?? null;
      break;
    }
    case 'fire': case 'earth': case 'air': case 'water': {
      for (const s of ELEMENT_SIGNS[id]) {
        const c = cardById(s)![ctx.lang];
        sections.push({ heading: `${ctx.names.signs[s]} · ${c.title}`, lines: [c.essence, c.message] });
        cards.push(s);
      }
      main = ELEMENT_SIGNS[id].at(0)!;
      break;
    }
    case 'certified':
      sections.push({ heading: TITLE.certified[ctx.lang], lines: [w.certifiedNext] });
      break;
  }

  const unique = [...new Set(cards)].filter((c) => cardById(c));
  const q = main ? cardById(main)?.[ctx.lang].question ?? null : null;
  return { ...base, sections, cards: unique, question: q };
}

/** Lunar month index (synodic month since the new moon of 6 January 2000, 18:14 UTC). */
export const lunation = (d: Date) => Math.floor((d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / (29.530588853 * 864e5));

/** Moon streak: consecutive lunar months with at least one finished lesson, ending this month or last. */
export function moonStreak(dates: Date[], now = new Date()): number {
  const months = new Set(dates.map(lunation));
  let m = lunation(now);
  if (!months.has(m)) m -= 1;
  let streak = 0;
  while (months.has(m)) { streak++; m--; }
  return streak;
}

export const lessonTitle = (id: string, lang: Locale) => TITLE[id]?.[lang] ?? id;
