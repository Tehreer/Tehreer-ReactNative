import { useEffect, useState } from 'react';
import type { FontFile, Typeface } from 'tehreer-react-native';
import { useFontFile } from './useFontFile';

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
