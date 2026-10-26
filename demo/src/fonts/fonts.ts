import { FontFile, initialize } from 'tehreer-react-native';

export interface FontOption {
  readonly id: string;
  readonly label: string;
  /** What `require()` of the font gives; Metro serves a `.ttf` as an asset. */
  readonly asset: number;
}

export const TEXT_FONTS: readonly FontOption[] = [
  { id: 'taj', label: 'AlQalam Taj Nastaleeq', asset: require('../../assets/fonts/taj-nastaleeq.ttf') as number },
  { id: 'mehr', label: 'Mehr Nastaliq Web', asset: require('../../assets/fonts/mehr-nastaliq.ttf') as number },
  { id: 'nafees', label: 'Nafees Web Naskh', asset: require('../../assets/fonts/nafees-web.ttf') as number },
];

/** The font of the Quran screen only: it has no Latin or Urdu letters, so it is not offered to the other screens. */
export const QURAN_FONT: FontOption = { id: 'noorehuda', label: 'Noorehuda', asset: require('../../assets/fonts/noorehuda.ttf') as number };

/** The typeface that the text screens start with, as in the Web demo. */
export const DEFAULT_TEXT_FONT = 'taj';

export const VARIABLE_FONTS: readonly FontOption[] = [
  { id: 'rocher', label: 'RocherColor', asset: require('../../assets/fonts/rocher-color.ttf') as number },
  { id: 'decovar', label: 'Decovar Alpha', asset: require('../../assets/fonts/decovar-alpha.ttf') as number },
  { id: 'sudo', label: 'Sudo', asset: require('../../assets/fonts/sudo.ttf') as number },
  { id: 'league', label: 'League Mono', asset: require('../../assets/fonts/league-mono.ttf') as number },
];

const ALL_FONTS = [...TEXT_FONTS, QURAN_FONT, ...VARIABLE_FONTS];

const files = new Map<string, Promise<FontFile>>();

/** Loads a font once for the whole demo; the file stays alive because every screen shares it. */
export function loadFont(id: string): Promise<FontFile> {
  const known = files.get(id);
  if (known !== undefined) {
    return known;
  }
  const option = ALL_FONTS.find((font) => font.id === id);
  if (option === undefined) {
    return Promise.reject(new Error(`Unknown font: ${id}`));
  }
  // initialize() is idempotent, so the demo does not depend on the test runner having called it.
  initialize();
  const file = FontFile.fromAsset(option.asset);
  // A failed load is not cached, so that reopening the screen tries again.
  file.catch(() => files.delete(id));
  files.set(id, file);
  return file;
}
