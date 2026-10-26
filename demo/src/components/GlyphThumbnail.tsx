import { useMemo } from 'react';
import { Image, View } from 'react-native';
import type { Renderer } from 'tehreer-react-native';
import { colors } from '../theme/colors';
import { fitGlyphBitmap } from '../utils/glyphBitmap';

/** A glyph, drawn from its ID in a box of a fixed size, shrunk if it is bigger than the box. The box has a border when `outlineColor` is given. */
export function GlyphThumbnail({ renderer, glyphId, width = 56, height = 40, size = 28, outlineColor }: {
  renderer: Renderer;
  glyphId: number;
  width?: number;
  height?: number;
  /** The type size in points, before the glyph is shrunk to fit. */
  size?: number;
  outlineColor?: string;
}) {
  const bitmap = useMemo(() => fitGlyphBitmap(renderer, glyphId, size, colors.text, width, height, 6), [renderer, glyphId, size, width, height]);

  return (
    <View style={{ width, height, borderWidth: outlineColor === undefined ? 0 : 1, borderColor: outlineColor }}>
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
