import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { TLabel } from 'tehreer-react-native';
import type { Typeface } from 'tehreer-react-native';
import { FontChoice } from './FontChoice';
import { TEXT_FONTS, useTypeface } from './fonts';
import { Card, Choice, Definition, Label, Message, Mono, Page, colors } from './ui';

const COLUMNS = 3;
const GAP = 10;
const PAGE_PADDING = 16;
const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, '0');

/**
 * Finds a character for each glyph that the character map reaches. The library draws text and not a
 * glyph by its ID, so a glyph that no character maps to (a ligature, a variant) shows only its ID.
 */
function mapCharacters(typeface: Typeface): Map<number, number> {
  const characters = new Map<number, number>();
  for (let codePoint = 0x20; codePoint <= 0xFFFF; codePoint++) {
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
      continue;
    }
    const glyphId = typeface.getGlyphId(codePoint);
    if (glyphId > 0 && !characters.has(glyphId)) {
      characters.set(glyphId, codePoint);
    }
  }
  return characters;
}

const GlyphCell = memo(function GlyphCell({ glyphId, codePoint, isSelected, typeface, width, onPick }: {
  width: number;
  glyphId: number;
  codePoint: number | undefined;
  isSelected: boolean;
  typeface: Typeface;
  onPick: (glyphId: number) => void;
}) {
  return (
    <Pressable onPress={() => onPick(glyphId)} style={[styles.cell, { width }, isSelected && styles.cellSelected]} testID={`glyph-${glyphId}`}>
      <Mono style={styles.cellId}>{hex(glyphId)}</Mono>
      <View style={styles.cellGlyph}>
        {codePoint !== undefined && (
          <TLabel text={String.fromCodePoint(codePoint)} textColor="#111A14" textSize={36} typeface={typeface} />
        )}
      </View>
    </Pressable>
  );
});

export function GlyphsScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState('mehr');
  const { typeface, error } = useTypeface(fontId);
  const [selected, setSelected] = useState<number | undefined>();
  const [characters, setCharacters] = useState<Map<number, number>>();
  // Glyphs that a character reaches can be drawn; the others show their ID only.
  const [filter, setFilter] = useState<'drawable' | 'all'>('drawable');
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = Math.floor((screenWidth - PAGE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  useEffect(() => {
    setSelected(undefined);
    setCharacters(undefined);
    if (typeface === undefined) {
      return;
    }
    // Deferred, so the screen is drawn before the 65,000 lookups of the character map.
    const timer = setTimeout(() => setCharacters(mapCharacters(typeface)), 0);
    return () => clearTimeout(timer);
  }, [typeface]);

  const glyphIds = useMemo(() => {
    if (filter === 'drawable' && characters !== undefined) {
      return [...characters.keys()].sort((a, b) => a - b);
    }
    return Array.from({ length: typeface?.glyphCount ?? 0 }, (_, index) => index);
  }, [typeface, filter, characters]);
  const pick = useCallback((glyphId: number) => setSelected((current) => (current === glyphId ? undefined : glyphId)), []);

  const header = (
    <View style={styles.header}>
      <Card>
        <FontChoice onChange={setFontId} options={TEXT_FONTS} value={fontId} />
      </Card>
      <Card>
        <Label>Show</Label>
        <Choice onChange={setFilter} options={[{ value: 'drawable', label: 'Glyphs of characters' }, { value: 'all', label: 'All glyphs' }]} value={filter} />
      </Card>
      {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
      {typeface !== undefined && selected !== undefined && (
        <Card title={`Glyph ${hex(selected)}`}>
          <Definition term="Glyph ID" value={selected} />
          <Definition term="Name" value={typeface.getGlyphName(selected)} />
          <Definition term="Advance" value={typeface.getGlyphAdvance(selected, typeface.unitsPerEm)} />
          <Definition term="Code point" value={characters?.get(selected) === undefined ? undefined : `U+${hex(characters.get(selected)!)}`} />
        </Card>
      )}
      {typeface !== undefined && (
        <Text style={styles.count}>{`${typeface.glyphCount} glyphs${characters === undefined ? '' : `, ${characters.size} reachable from a character`}`}</Text>
      )}
    </View>
  );

  return (
    <Page title="Typeface Glyphs" onBack={onBack} scroll={false}>
      <FlatList
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.list}
        data={glyphIds}
        initialNumToRender={18}
        keyExtractor={(glyphId) => String(glyphId)}
        ListHeaderComponent={header}
        numColumns={COLUMNS}
        renderItem={({ item }) => (
          <GlyphCell
            codePoint={characters?.get(item)}
            glyphId={item}
            isSelected={item === selected}
            onPick={pick}
            typeface={typeface!}
            width={cellWidth}
          />
        )}
        style={styles.flat}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  flat: { marginHorizontal: -PAGE_PADDING },
  list: { paddingHorizontal: PAGE_PADDING, paddingBottom: 48, gap: GAP },
  header: { gap: 12, marginBottom: 4 },
  count: { fontSize: 13, color: colors.muted },
  columns: { gap: GAP },
  cell: { minHeight: 92, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 8 },
  cellSelected: { borderColor: colors.accent, borderWidth: 2 },
  cellId: { fontSize: 12, color: colors.muted },
  cellGlyph: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
