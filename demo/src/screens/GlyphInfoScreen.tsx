import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Typeface } from 'tehreer-react-native';
import { makeGlyphBitmap, makeGlyphRenderer } from '../utils/glyphBitmap';
import { AppBar } from '../components/AppBar';
import { Definition } from '../components/Definition';
import { Rows } from '../components/Rows';
import { Section } from '../components/Section';
import { colors } from '../theme/colors';
import { mono } from '../theme/mono';
import { slide } from '../theme/slide';

const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, '0');

// The figure is laid out in the units of the mockup (a 400 by 300 view box) and scaled to the
// width that is available, which is at most 70% of the view box (280 points).
const BOX_WIDTH = 400;
const BOX_HEIGHT = 300;
const MAX_SCALE = 0.7;
const ASCENT_Y = 50;
const DESCENT_Y = 240;
const ORIGIN_X = 70;
const SIDE = 70;
const FILL_COLOR = '#E3F4E3';
const OUTLINE_COLOR = '#111A14';
const OUTLINE_RADIUS = 0.75;

interface Measure {
  readonly advance: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
  readonly top: number;
  readonly isEmpty: boolean;
}

/** The numbers of the glyph in font units: one pixel of a renderer at the size of the em is one unit. */
function measure(typeface: Typeface, glyphId: number): Measure {
  const renderer = makeGlyphRenderer(typeface);
  try {
    renderer.typeSize = typeface.unitsPerEm;
    const box = renderer.computeGlyphInkBox(glyphId);
    return {
      advance: typeface.getGlyphAdvance(glyphId, typeface.unitsPerEm),
      left: box.x,
      right: box.x + box.width,
      // The box has the y axis pointing down, the bounds point up.
      top: -box.y,
      bottom: -(box.y + box.height),
      isEmpty: box.width <= 0 || box.height <= 0,
    };
  } finally {
    renderer.dispose();
  }
}

/** The glyph of the figure, filled and outlined, at a size in points. */
function makeFigureBitmaps(typeface: Typeface, glyphId: number, typeSize: number) {
  const renderer = makeGlyphRenderer(typeface);
  try {
    return {
      fill: makeGlyphBitmap(renderer, glyphId, typeSize, FILL_COLOR),
      outline: makeGlyphBitmap(renderer, glyphId, typeSize, OUTLINE_COLOR, OUTLINE_RADIUS),
    };
  } finally {
    renderer.dispose();
  }
}

function GlyphFigure({ typeface, glyphId, measured }: { typeface: Typeface; glyphId: number; measured: Measure }) {
  const { width: windowWidth } = useWindowDimensions();
  const available = windowWidth - 32 - 34;

  const layout = useMemo(() => {
    const unit = (DESCENT_Y - ASCENT_Y) / (typeface.ascent + typeface.descent);
    const advance = measured.advance * unit;
    const inkLeft = measured.left * unit;
    const inkRight = measured.right * unit;
    const originX = Math.max(ORIGIN_X, ORIGIN_X - inkLeft);
    const boxWidth = Math.ceil(Math.max(BOX_WIDTH, originX + Math.max(advance, inkRight) + SIDE));
    const scale = Math.min(MAX_SCALE, available / boxWidth);
    return { unit, advance, originX, boxWidth, scale, baselineY: ASCENT_Y + typeface.ascent * unit };
  }, [typeface, measured, available]);

  const { unit, originX, boxWidth, scale, baselineY } = layout;
  const bitmaps = useMemo(
    () => makeFigureBitmaps(typeface, glyphId, typeface.unitsPerEm * unit * scale),
    [typeface, glyphId, unit, scale],
  );

  const width = boxWidth * scale;
  const height = BOX_HEIGHT * scale;
  const originPx = originX * scale;
  const baselinePx = baselineY * scale;
  const advancePx = (originX + layout.advance) * scale;
  const line = { position: 'absolute', backgroundColor: colors.inputBorder } as const;
  const placed = (bitmap: { uri: string; x: number; y: number; width: number; height: number } | undefined) => bitmap === undefined ? null : (
    <Image
      fadeDuration={0}
      source={{ uri: bitmap.uri }}
      style={{ position: 'absolute', left: originPx + bitmap.x, top: baselinePx + bitmap.y, width: bitmap.width, height: bitmap.height }}
    />
  );

  return (
    <View accessibilityLabel="Outline of the selected glyph against the ascent, baseline and descent lines" style={{ alignSelf: 'center', width, height }}>
      <View style={[line, { left: originPx, top: 10 * scale, width: 1.5, height: 280 * scale }]} />
      <View style={[line, { left: advancePx, top: 10 * scale, width: 1.5, height: 280 * scale }]} />
      <View style={[line, { left: 0, top: ASCENT_Y * scale, width, height: 1.5 }]} />
      <View style={[line, { left: 0, top: DESCENT_Y * scale, width, height: 1.5 }]} />
      <View style={[line, { left: 0, top: baselinePx, width, height: 2, backgroundColor: colors.primary }]} />
      {placed(bitmaps.fill)}
      {placed(bitmaps.outline)}
      {!measured.isEmpty && (
        <View
          style={{
            position: 'absolute',
            left: originPx + measured.left * unit * scale,
            top: baselinePx - measured.top * unit * scale,
            width: (measured.right - measured.left) * unit * scale,
            height: (measured.top - measured.bottom) * unit * scale,
            borderWidth: 1,
            borderColor: colors.bounds,
          }}
        />
      )}
      <View style={[styles.origin, { left: originPx - 5, top: baselinePx - 5 }]} />
      <Text style={[styles.tag, { left: advancePx + 4, top: 12 * scale }]}>advance</Text>
      <Text style={[styles.tag, { left: 4, top: ASCENT_Y * scale - 14 }]}>ascent</Text>
      <Text style={[styles.tag, { left: 4, top: DESCENT_Y * scale + 3 }]}>descent</Text>
      {!measured.isEmpty && (
        <Text style={[styles.tag, { left: originPx + measured.right * unit * scale + 4, top: baselinePx - measured.top * unit * scale - 2, color: colors.bounds }]}>bounds</Text>
      )}
    </View>
  );
}

/**
 * The screen of a glyph, opened from the grid: its outline against the metrics lines, its numbers,
 * and buttons for the glyphs before and after it. It is a modal, so the back button of Android and
 * the close button of the bar both close it.
 */
export function GlyphInfoScreen({ typeface, glyphId, codePoint, onSelect, onClose }: {
  typeface: Typeface;
  glyphId: number;
  codePoint: number | undefined;
  onSelect: (glyphId: number) => void;
  onClose: () => void;
}) {
  const measured = useMemo(() => measure(typeface, glyphId), [typeface, glyphId]);
  // The page slides up on its own, so the modal itself does not animate; it is closed after the slide down.
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const { height: windowHeight } = useWindowDimensions();
  useEffect(() => {
    slide(progress, 1);
  }, [progress]);
  const close = () => {
    if (closing.current) {
      return;
    }
    closing.current = true;
    slide(progress, 0, (finished) => finished && onClose());
  };
  const last = typeface.glyphCount - 1;
  const round = (value: number) => Math.round(value);

  return (
    <Modal animationType="none" onRequestClose={close} statusBarTranslucent transparent visible>
      <Animated.View style={[styles.page, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] }) }] }]}>
        <AppBar icon="close" onBack={close} title="Glyph Info" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.figure}>
            <GlyphFigure glyphId={glyphId} measured={measured} typeface={typeface} />
          </View>

          <Section title="Metrics">
            <Rows>
              <Definition isMono term="Glyph ID" value={hex(glyphId)} />
              <Definition isMono term="Unicode" value={codePoint === undefined ? undefined : `U+${hex(codePoint)}`} />
              <Definition isMono term="Advance" value={round(measured.advance)} />
              <Definition
                isMono
                term="Bounds"
                value={measured.isEmpty ? undefined : `(${round(measured.left)}, ${round(measured.bottom)}, ${round(measured.right)}, ${round(measured.top)})`}
              />
              <Definition isMono term="Ascent" value={typeface.ascent} />
              <Definition isLast isMono term="Descent" value={typeface.descent} />
            </Rows>
          </Section>

          <View style={styles.steps}>
            <Pressable
              accessibilityRole="button"
              disabled={glyphId <= 0}
              onPress={() => onSelect(glyphId - 1)}
              style={[styles.step, glyphId <= 0 && styles.stepDisabled]}
              testID="glyphPrevious"
            >
              <Text style={styles.stepText}>{`‹ Glyph ${hex(Math.max(0, glyphId - 1))}`}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={glyphId >= last}
              onPress={() => onSelect(glyphId + 1)}
              style={[styles.step, glyphId >= last && styles.stepDisabled]}
              testID="glyphNext"
            >
              <Text style={styles.stepText}>{`Glyph ${hex(Math.min(last, glyphId + 1))} ›`}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },
  figure: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 16 },
  origin: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: colors.text },
  tag: { position: 'absolute', fontFamily: mono, fontSize: 10, color: colors.muted },
  steps: { flexDirection: 'row', gap: 10 },
  step: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.4 },
  stepText: { fontSize: 15, fontWeight: '500', color: colors.text },
});
