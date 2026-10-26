import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Renderer, Typeface } from 'tehreer-react-native';
import { FontChoice } from './FontChoice';
import { DEFAULT_TEXT_FONT, TEXT_FONTS, useTypeface } from './fonts';
import { GlyphInfoModal } from './GlyphInfoModal';
import { makeGlyphBitmap, makeGlyphRenderer, measureGlyph } from './glyphBitmap';
import type { GlyphBitmap } from './glyphBitmap';
import { Button, Card, Field, Message, Mono, Page, colors, inputStyle, mono } from './ui';
import { useOwned } from './useOwned';

const COLUMNS = 4;
const GAP = 8;
const CELL_HEIGHT = 80;
const ROW_HEIGHT = CELL_HEIGHT + GAP;
const GLYPH_AREA = 34;
const GLYPH_SIZE = 28;
const SKELETON_CELLS = 8;
const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, '0');

const CHUNK = 4096;

/**
 * Finds a character for each glyph that the character map reaches, to show its Unicode value. It
 * works in chunks and gives the JS thread back between them, so the screen stays responsive.
 */
function mapCharacters(typeface: Typeface, onDone: (characters: Map<number, number>) => void): () => void {
  const characters = new Map<number, number>();
  let codePoint = 0x20;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const step = () => {
    const end = Math.min(codePoint + CHUNK, 0x10000);
    for (; codePoint < end; codePoint++) {
      if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
        continue;
      }
      const glyphId = typeface.getGlyphId(codePoint);
      if (glyphId > 0 && !characters.has(glyphId)) {
        characters.set(glyphId, codePoint);
      }
    }
    if (codePoint < 0x10000) {
      timer = setTimeout(step, 0);
    } else {
      onDone(characters);
    }
  };

  timer = setTimeout(step, 0);
  return () => clearTimeout(timer);
}

/** A renderer together with the typeface it was made for, so that a cell never mixes the two. */
class GlyphRenderer {
  readonly renderer: Renderer;
  readonly typeface: Typeface;

  constructor(typeface: Typeface) {
    this.typeface = typeface;
    this.renderer = makeGlyphRenderer(typeface);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

/** The glyph of a cell, shrunk to fit its area, and where to put it in the area. */
function drawCell(renderer: Renderer, glyphId: number, areaWidth: number): (GlyphBitmap & { left: number; top: number }) | undefined {
  let size = GLYPH_SIZE;
  let box = measureGlyph(renderer, glyphId, size);
  if (box.width <= 0 || box.height <= 0) {
    return undefined;
  }
  const fit = Math.min(1, (areaWidth - 6) / box.width, GLYPH_AREA / box.height);
  if (fit < 1) {
    size *= fit;
    box = measureGlyph(renderer, glyphId, size);
  }
  const bitmap = makeGlyphBitmap(renderer, glyphId, size, colors.text);
  if (bitmap === undefined) {
    return undefined;
  }
  // The pen goes where the middle of the ink is in the middle of the area.
  const penX = areaWidth / 2 - (box.x + box.width / 2);
  const penY = GLYPH_AREA / 2 - (box.y + box.height / 2);
  return { ...bitmap, left: penX + bitmap.x, top: penY + bitmap.y };
}

const GlyphCell = memo(function GlyphCell({ glyphId, renderer, width, onPick }: {
  glyphId: number;
  renderer: Renderer;
  width: number;
  onPick: (glyphId: number) => void;
}) {
  const areaWidth = width - 2;
  const bitmap = useMemo(() => drawCell(renderer, glyphId, areaWidth), [renderer, glyphId, areaWidth]);

  return (
    <Pressable
      accessibilityLabel={`Glyph ${hex(glyphId)}`}
      accessibilityRole="button"
      onPress={() => onPick(glyphId)}
      style={({ pressed }) => [styles.cell, { width }, pressed && { backgroundColor: colors.pressed }]}
      testID={`glyph-${glyphId}`}
    >
      <View style={styles.glyphArea}>
        {bitmap !== undefined && (
          <Image
            fadeDuration={0}
            source={{ uri: bitmap.uri }}
            style={{ position: 'absolute', left: bitmap.left, top: bitmap.top, width: bitmap.width, height: bitmap.height }}
          />
        )}
        {/* .notdef often has no ink to draw, and the mockup shows an empty box for it. */}
        {bitmap === undefined && glyphId === 0 && <View style={styles.notdef} />}
      </View>
      <Mono style={styles.cellId}>{hex(glyphId)}</Mono>
    </Pressable>
  );
});

export function GlyphsScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState(DEFAULT_TEXT_FONT);
  const { typeface, error } = useTypeface(fontId);
  const [selected, setSelected] = useState<number | undefined>();
  const [characters, setCharacters] = useState<Map<number, number>>();
  const [goTo, setGoTo] = useState('0000');
  const [gridWidth, setGridWidth] = useState(0);
  const list = useRef<FlatList<number>>(null);

  const owned = useOwned(() => (typeface === undefined ? undefined : new GlyphRenderer(typeface)), [typeface]);
  const renderer = owned !== undefined && owned.typeface === typeface ? owned.renderer : undefined;

  useEffect(() => {
    setSelected(undefined);
    setCharacters(undefined);
    setGoTo('0000');
    if (typeface === undefined) {
      return;
    }
    // Cancelled when the typeface changes or goes, so no lookup reads a typeface that is disposed.
    return mapCharacters(typeface, setCharacters);
  }, [typeface]);

  const glyphCount = typeface?.glyphCount ?? 0;
  const glyphIds = useMemo(() => Array.from({ length: glyphCount }, (_, index) => index), [glyphCount]);
  const cellWidth = Math.floor((gridWidth - GAP * (COLUMNS - 1)) / COLUMNS);
  const pick = useCallback((glyphId: number) => setSelected(glyphId), []);

  const jump = () => {
    const id = Number.parseInt(goTo, 16);
    if (Number.isNaN(id) || glyphCount === 0) {
      return;
    }
    const target = Math.min(Math.max(id, 0), glyphCount - 1);
    setGoTo(hex(target));
    list.current?.scrollToOffset({ offset: Math.floor(target / COLUMNS) * ROW_HEIGHT, animated: false });
  };

  const isLoading = typeface === undefined && error === undefined;

  return (
    <Page title="Typeface Glyphs" onBack={onBack} scroll={false}>
      <Card>
        <FontChoice disabled={typeface === undefined} onChange={setFontId} options={TEXT_FONTS} value={fontId} />
        <View style={styles.goRow}>
          <Field label="Go to glyph ID" style={{ flex: 1 }}>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={setGoTo}
              onSubmitEditing={jump}
              returnKeyType="go"
              style={[inputStyle, { fontFamily: mono }]}
              testID="glyphGoTo"
              value={goTo}
            />
          </Field>
          <Button label="Go" onPress={jump} style={styles.go} testID="glyphGo" />
        </View>
      </Card>

      <Card style={styles.all}>
        <View style={styles.head}>
          <Text style={styles.headTitle}>All glyphs</Text>
          {typeface !== undefined && <Text style={styles.headMeta}>{`${glyphCount} glyphs`}</Text>}
        </View>
        {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
        <View onLayout={(event: LayoutChangeEvent) => setGridWidth(Math.floor(event.nativeEvent.layout.width))} style={styles.grid}>
          {isLoading && (
            <View accessibilityRole="progressbar">
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading the typeface…</Text>
              </View>
              <View style={styles.skeletons}>
                {Array.from({ length: SKELETON_CELLS }, (_, index) => (
                  <View key={index} style={[styles.skeleton, { width: cellWidth > 0 ? cellWidth : 0 }]} />
                ))}
              </View>
            </View>
          )}
          {typeface !== undefined && renderer !== undefined && cellWidth > 0 && (
            <FlatList
              columnWrapperStyle={styles.columns}
              data={glyphIds}
              getItemLayout={(_data, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              initialNumToRender={24}
              keyExtractor={(glyphId) => String(glyphId)}
              maxToRenderPerBatch={16}
              numColumns={COLUMNS}
              ref={list}
              renderItem={({ item }) => <GlyphCell glyphId={item} onPick={pick} renderer={renderer} width={cellWidth} />}
              windowSize={7}
            />
          )}
        </View>
      </Card>

      {typeface !== undefined && selected !== undefined && (
        <GlyphInfoModal
          codePoint={characters?.get(selected)}
          glyphId={selected}
          onClose={() => setSelected(undefined)}
          onSelect={setSelected}
          typeface={typeface}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  goRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  go: { height: 48, paddingHorizontal: 24, borderRadius: 10 },
  all: { flex: 1, gap: 12, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  headTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  headMeta: { fontFamily: mono, fontSize: 12, color: colors.muted },
  grid: { flex: 1 },
  columns: { gap: GAP, marginBottom: GAP },
  cell: { height: CELL_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card },
  glyphArea: { width: '100%', height: GLYPH_AREA, alignItems: 'center', justifyContent: 'center' },
  notdef: { width: 22, height: 30, borderWidth: 1.5, borderColor: colors.disabled, borderRadius: 2 },
  cellId: { fontSize: 11, color: colors.muted },
  loading: { alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 },
  loadingText: { fontSize: 15, color: colors.label },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  skeleton: { height: CELL_HEIGHT, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.skeleton },
});
