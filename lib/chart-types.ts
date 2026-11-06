export type SignKey = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';
export type PointKey = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'northNode' | 'southNode' | 'chiron' | 'pholus' | 'nessus' | 'lilith' | 'asc' | 'mc' | 'dsc' | 'ic';
export type AspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

export interface Position {
  key: PointKey;
  longitude: number;
  sign: SignKey;
  signIndex: number;
  degree: number;
  minute: number;
  element: 'fire' | 'earth' | 'air' | 'water';
  modality: 'cardinal' | 'fixed' | 'mutable';
  speed?: number;
  retrograde?: boolean;
  house?: number;
}

export interface Aspect { a: PointKey; b: PointKey; type: AspectType; exactAngle: number; orb: number; applying: boolean }

export interface Chart {
  name: string | null;
  input: { date: string; time: string | null; lat: number; lon: number; timezone: string };
  utc: { year: number; month: number; day: number; hour: number; minute: number; offsetSeconds: number; isDst: boolean; abbreviation: string };
  timeKnown: boolean;
  houseSystem: string | null;
  points: Position[];
  angles: { asc: Position; mc: Position; dsc: Position; ic: Position } | null;
  houses: (Position & { house: number })[] | null;
  aspects: Aspect[];
  elements: Record<'fire' | 'earth' | 'air' | 'water', number>;
  modalities: Record<'cardinal' | 'fixed' | 'mutable', number>;
  bigThree: { sun: SignKey; moon: SignKey; rising: SignKey | null };
  moonSignUncertain: boolean;
  warnings: string[];
}

export interface Place { id: number; name: string; country: string; countryName: string; lat: number; lon: number; timezone: string }

export interface Composite {
  method: 'midpoint';
  points: Position[];
  angles: Chart['angles'];
  houses: Chart['houses'];
  aspects: Aspect[];
  elements: Chart['elements'];
  modalities: Chart['modalities'];
}

export interface Relationship {
  a: Chart;
  b: Chart;
  synastry: { aspects: Aspect[]; aInB: { key: PointKey; house: number }[] | null; bInA: { key: PointKey; house: number }[] | null };
  composite: Composite;
}
