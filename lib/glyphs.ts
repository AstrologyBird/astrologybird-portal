import type { PointKey, SignKey } from './chart-types';

// U+FE0E asks for the text (not emoji) presentation of each symbol.
const T = '︎';
export const SIGN_GLYPH: Record<SignKey, string> = {
  aries: '♈' + T, taurus: '♉' + T, gemini: '♊' + T, cancer: '♋' + T, leo: '♌' + T, virgo: '♍' + T,
  libra: '♎' + T, scorpio: '♏' + T, sagittarius: '♐' + T, capricorn: '♑' + T, aquarius: '♒' + T, pisces: '♓' + T,
};
export const POINT_GLYPH: Record<PointKey, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅',
  neptune: '♆', pluto: '♇', northNode: '☊', southNode: '☋', chiron: '⚷', pholus: 'Ph', nessus: 'Ns', lilith: '⚸', asc: 'AC', mc: 'MC', dsc: 'DC', ic: 'IC',
};
export const SIGNS: SignKey[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
export const ELEMENT_OF = (i: number) => (['fire', 'earth', 'air', 'water'] as const)[i % 4];
