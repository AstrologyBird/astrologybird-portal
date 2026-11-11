import type { Place } from './chart-types';

export interface PersonRow {
  id: string;
  name: string;
  relation: string | null;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  place_name: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  locale: 'en' | 'nl';
  birth_date: string | null;
  birth_time: string | null;
  time_unknown: boolean;
  place_name: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
  house_system: 'placidus' | 'wholeSign';
  digest_opt_in: boolean;
  digest_hour: number;
}

/** Birth data as entered in a form, shared by the chart and relationship tools. */
export interface BirthInput { name: string; date: string; time: string; timeUnknown: boolean; place: Place | null }

export const placeFromRow = (r: { place_name: string | null; lat: number | null; lon: number | null; timezone: string | null }): Place | null =>
  r.place_name && r.lat !== null && r.lon !== null && r.timezone
    ? { id: 0, name: r.place_name, country: '', countryName: '', lat: r.lat, lon: r.lon, timezone: r.timezone }
    : null;

export const inputFromPerson = (r: PersonRow): BirthInput => ({
  name: r.name, date: r.birth_date, time: r.birth_time?.slice(0, 5) ?? '', timeUnknown: r.time_unknown, place: placeFromRow(r),
});

export const inputFromProfile = (r: ProfileRow): BirthInput | null =>
  r.birth_date ? { name: r.display_name ?? '', date: r.birth_date, time: r.birth_time?.slice(0, 5) ?? '', timeUnknown: r.time_unknown, place: placeFromRow(r) } : null;

export const placeLabel = (p: Place) => (p.countryName ? `${p.name}, ${p.countryName}` : p.name);

/** Columns for inserting a person from form input. */
export const personColumns = (i: BirthInput) => ({
  name: i.name.trim() || '—', birth_date: i.date, birth_time: i.timeUnknown ? null : i.time, time_unknown: i.timeUnknown,
  place_name: placeLabel(i.place!), lat: i.place!.lat, lon: i.place!.lon, timezone: i.place!.timezone,
});

export const PENDING_KEY = 'astrologybird:pending-save';
