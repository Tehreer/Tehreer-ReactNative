import ayahs from './AlKahf.json';

/** One verse of the surah, from the Android demo: its text and the colored ranges inside it. */
export interface Ayah {
  readonly text: string;
  readonly attributes: readonly { readonly start: number; readonly end: number; readonly color: string }[];
}

export const SURAH_TITLE = 'Al Kahf';
export const SURAH: readonly Ayah[] = ayahs;
