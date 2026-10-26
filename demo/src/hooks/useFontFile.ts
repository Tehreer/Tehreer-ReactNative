import type { FontFile } from 'tehreer-react-native';
import { loadFont } from '../fonts/fonts';
import { useLoaded } from './useLoaded';
import type { Loaded } from './useLoaded';

export function useFontFile(id: string): Loaded<FontFile> {
  return useLoaded(id, () => loadFont(id));
}
