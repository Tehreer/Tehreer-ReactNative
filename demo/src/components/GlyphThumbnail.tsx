import { useMemo } from 'react';
import { Image, View } from 'react-native';
import type { Renderer } from 'tehreer-react-native';
import { colors } from '../theme/colors';
import { fitGlyphBitmap } from '../utils/glyphBitmap';

/** A glyph, drawn from its ID in a box of a fixed size, shrunk if it is bigger than the box. */
export function GlyphThumbnail({ renderer, glyphId, width = 56, height = 40, size = 28 }: {
  renderer: Renderer;
  glyphId: number;
  width?: number;
  height?: number;
  /** The type size in points, before the glyph is shrunk to fit. */
  size?: number;
}) {
  const bitmap = useMemo(() => fitGlyphBitmap(renderer, glyphId, size, colors.text, width, height), [renderer, glyphId, size, width, height]);

  return (
    <View style={{ width, height }}>
      {bitmap !== undefined && (
        <Image
          fadeDuration={0}
          source={{ uri: bitmap.uri }}
          style={{ position: 'absolute', left: bitmap.left, top: bitmap.top, width: bitmap.width, height: bitmap.height }}
        />
      )}
    </View>
  );
}
