import { useEffect, useState } from 'react';
import { FontFile, initialize } from 'tehreer-react-native';
import type { Typeface } from 'tehreer-react-native';

export interface FontOption {
  readonly id: string;
  readonly label: string;
  /** What `require()` of the font gives; Metro serves a `.ttf` as an asset. */
  readonly asset: number;
}

export const TEXT_FONTS: readonly FontOption[] = [
  { id: 'mehr', label: 'Mehr Nastaliq Web', asset: require('../assets/demo-fonts/mehr-nastaliq.ttf') as number },
  { id: 'noto', label: 'Noto Nastaliq Urdu', asset: require('../assets/fonts/NotoNastaliqUrdu-Regular.ttf') as number },
  { id: 'nafees', label: 'Nafees Web Naskh', asset: require('../assets/demo-fonts/nafees-web.ttf') as number },
  { id: 'noorehuda', label: 'Noorehuda', asset: require('../assets/demo-fonts/noorehuda.ttf') as number },
];

export const VARIABLE_FONTS: readonly FontOption[] = [
  { id: 'rocher', label: 'RocherColor', asset: require('../assets/demo-fonts/rocher-color.ttf') as number },
  { id: 'decovar', label: 'Decovar Alpha', asset: require('../assets/demo-fonts/decovar-alpha.ttf') as number },
  { id: 'sudo', label: 'Sudo', asset: require('../assets/demo-fonts/sudo.ttf') as number },
  { id: 'league', label: 'League Mono', asset: require('../assets/demo-fonts/league-mono.ttf') as number },
];

const ALL_FONTS = [...TEXT_FONTS, ...VARIABLE_FONTS];

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

export interface Loaded<T> {
  readonly value: T | undefined;
  readonly error: Error | undefined;
}

export function useLoaded<T>(key: string, load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ key: string; value?: T; error?: Error }>({ key });

  useEffect(() => {
    let isCurrent = true;
    load().then(
      (value) => isCurrent && setState({ key, value }),
      (error: unknown) => isCurrent && setState({ key, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      isCurrent = false;
    };
    // The key stands for the loader.
  }, [key]);

  const isStale = state.key !== key;
  return { value: isStale ? undefined : state.value, error: isStale ? undefined : state.error };
}

export function useFontFile(id: string): Loaded<FontFile> {
  return useLoaded(id, () => loadFont(id));
}

/** The first typeface of a font, which the demo never disposes: it stays as long as the font file. */
export function useTypeface(id: string): { typeface: Typeface | undefined; file: FontFile | undefined; error: Error | undefined } {
  const font = useFontFile(id);
  const [typeface, setTypeface] = useState<{ file: FontFile; typeface: Typeface }>();
  useEffect(() => {
    const file = font.value;
    setTypeface(file === undefined ? undefined : { file, typeface: file.typefaces.get(0) });
  }, [font.value]);
  return {
    typeface: typeface !== undefined && typeface.file === font.value ? typeface.typeface : undefined,
    file: font.value,
    error: font.error,
  };
}
