import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ShapingEngine, SfntTag } from 'tehreer-react-native';
import type { Renderer, Typeface } from 'tehreer-react-native';
import { FontChoice } from '../components/FontChoice';
import { DEFAULT_TEXT_FONT, TEXT_FONTS } from '../fonts/fonts';
import { useOwned } from '../hooks/useOwned';
import { useTypeface } from '../hooks/useTypeface';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { GlyphThumbnail } from '../components/GlyphThumbnail';
import { Message } from '../components/Message';
import { Page } from '../components/Page';
import { Section } from '../components/Section';
import { colors } from '../theme/colors';
import { inputStyle } from '../theme/inputStyle';
import { makeGlyphRenderer } from '../utils/glyphBitmap';
import { mono } from '../theme/mono';
import { naskh } from '../theme/naskh';

const DEFAULT_TEXT = 'زبان کو مختلف علامتوں اور رموز کے ذریعے لکھنے کو تحریر کہتے ہیں۔';

interface Settings {
  readonly typeSize: number;
  readonly script: string;
  readonly language: string;
  readonly text: string;
}

interface GlyphInfo {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly advance: number;
}

interface Character {
  readonly shown: string;
  readonly code: string;
}

interface Cluster {
  readonly characters: Character[];
  readonly glyphs: GlyphInfo[];
}

const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, '0');
const round = (value: number) => Math.trunc(value + 0.5);

function isValidTag(tag: string): boolean {
  try {
    SfntTag.make(tag);
    return true;
  } catch {
    return false;
  }
}

/** A character of the input as the list shows it: the character itself (a visible mark for a space) and its code. */
function describe(character: string): Character {
  const point = character.codePointAt(0)!;
  return { shown: point === 0x20 ? '␣' : point < 0x20 || point === 0x2029 ? '↵' : character, code: hex(point) };
}

/** Shapes the text and groups characters and glyphs by cluster, copying what it needs out of Core. */
function shape(typeface: Typeface, settings: Settings): Cluster[] {
  const engine = new ShapingEngine();
  try {
    const scriptTag = SfntTag.make(settings.script);
    engine.typeface = typeface;
    engine.typeSize = settings.typeSize;
    engine.scriptTag = scriptTag;
    engine.languageTag = SfntTag.make(settings.language);
    engine.writingDirection = ShapingEngine.getScriptDefaultDirection(scriptTag);

    const result = engine.shapeText(settings.text, 0, settings.text.length);
    try {
      const clusterMap = result.clusterMap.toArray();
      const ids = result.glyphIds.toArray();
      const offsets = result.glyphOffsets.toArray();
      const advances = result.glyphAdvances.toArray();
      const starts = [...new Set(clusterMap)].sort((a, b) => a - b);

      const clusters: Cluster[] = [];
      let index = 0;
      while (index < clusterMap.length) {
        const glyphStart = clusterMap[index]!;
        let end = index;
        while (end < clusterMap.length && clusterMap[end] === glyphStart) {
          end++;
        }
        const next = starts[starts.indexOf(glyphStart) + 1] ?? ids.length;

        const characters: Character[] = [];
        for (const character of settings.text.slice(index, end)) {
          characters.push(describe(character));
        }
        const glyphs: GlyphInfo[] = [];
        for (let g = glyphStart; g < next; g++) {
          glyphs.push({ id: ids[g]!, x: round(offsets[g]!.x), y: round(offsets[g]!.y), advance: round(advances[g]!) });
        }
        clusters.push({ characters, glyphs });
        index = end;
      }
      return clusters;
    } finally {
      result.dispose();
    }
  } finally {
    engine.dispose();
  }
}

/** One field of a cluster: the same height for every row, in two columns of fixed size, with the name and then the value written from the left. */
function Row({ term, value, isMono = false }: { term: string; value: string; isMono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.term}>{term}</Text>
      <Text style={[styles.value, isMono && styles.mono]}>{value}</Text>
    </View>
  );
}

/** A character of a cluster: its code and the character itself on one baseline; the characters after the first have "..." in place of the name. */
function CharacterRow({ character, isFirst }: { character: { shown: string; code: string }; isFirst: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.term}>{isFirst ? 'Character' : '...'}</Text>
      <View style={styles.character}>
        <Text style={styles.value}>{`U+${character.code}`}</Text>
        <Text style={styles.shown}>{character.shown}</Text>
      </View>
    </View>
  );
}

/** A renderer together with the typeface it was made for. */
class GlyphRenderer {
  readonly typeface: Typeface;
  readonly renderer: Renderer;

  constructor(typeface: Typeface) {
    this.typeface = typeface;
    this.renderer = makeGlyphRenderer(typeface);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

/** The ID of a glyph along with the glyph itself. */
function GlyphIdRow({ renderer, glyphId }: { renderer: Renderer | undefined; glyphId: number }) {
  return (
    <View style={[styles.row, styles.glyphRow]}>
      <Text style={styles.term}>Glyph ID</Text>
      <View style={styles.glyphContent}>
        <Text style={[styles.value, styles.mono]}>{hex(glyphId)}</Text>
        {renderer !== undefined && <GlyphThumbnail glyphId={glyphId} renderer={renderer} />}
      </View>
    </View>
  );
}

export function ShapingScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState(DEFAULT_TEXT_FONT);
  const { typeface, error } = useTypeface(fontId);
  // The renderer is used only for the typeface it was made for, so that a glyph ID is never drawn with another font.
  const owned = useOwned(() => (typeface === undefined ? undefined : new GlyphRenderer(typeface)), [typeface]);
  const renderer = owned !== undefined && owned.typeface === typeface ? owned.renderer : undefined;

  const [size, setSize] = useState('2048');
  const [script, setScript] = useState('arab');
  const [language, setLanguage] = useState('dflt');
  const [text, setText] = useState(DEFAULT_TEXT);
  const [applied, setApplied] = useState<Settings>({ typeSize: 2048, script: 'arab', language: 'dflt', text: DEFAULT_TEXT });
  const [problem, setProblem] = useState<string | undefined>();

  const apply = () => {
    const typeSize = Number.parseInt(size, 10);
    if (!Number.isFinite(typeSize) || typeSize <= 0) {
      setProblem('Write a valid type size!');
    } else if (!isValidTag(script)) {
      setProblem('Write a valid script tag!');
    } else if (!isValidTag(language)) {
      setProblem('Write a valid language tag!');
    } else {
      setProblem(undefined);
      setApplied({ typeSize, script, language, text });
    }
  };

  const clusters = useMemo(() => {
    if (typeface === undefined) {
      return undefined;
    }
    try {
      return shape(typeface, applied);
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, [typeface, applied]);

  return (
    <Page title="OpenType Shaping" onBack={onBack}>
      <Card>
        <Field label="Input text">
          <TextInput multiline onChangeText={setText} style={[styles.input, styles.urdu]} testID="shapingText" value={text} />
        </Field>
        <FontChoice disabled={typeface === undefined} onChange={setFontId} options={TEXT_FONTS} value={fontId} />
        <View style={styles.tags}>
          <Field label="Type size" style={{ flex: 1.3 }}>
            <TextInput inputMode="numeric" onChangeText={setSize} style={styles.tag} testID="shapingSize" value={size} />
          </Field>
          <Field label="Script" style={{ flex: 1 }}>
            <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setScript} style={styles.tag} testID="shapingScript" value={script} />
          </Field>
          <Field label="Language" style={{ flex: 1 }}>
            <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setLanguage} style={styles.tag} testID="shapingLanguage" value={language} />
          </Field>
        </View>
        {problem !== undefined && <Message tone="error">{problem}</Message>}
        <Button label="Shape" onPress={apply} testID="shapingShape" />
      </Card>

      <Section meta={Array.isArray(clusters) ? `${clusters.length} cluster${clusters.length === 1 ? '' : 's'}` : undefined} title="Shaping Info">
        {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
        {typeface === undefined && error === undefined && <Message>Loading the typeface…</Message>}
        {typeof clusters === 'string' && <Message tone="error">{clusters}</Message>}
        {Array.isArray(clusters) && (
          <View style={styles.list}>
            {clusters.map((cluster, index) => (
              <View key={index} style={[styles.cluster, index < clusters.length - 1 && styles.rule]}>
                <Text style={styles.clusterTitle}>{`Cluster ${index + 1}`}</Text>
                {cluster.characters.map((character, at) => (
                  <CharacterRow key={`c${at}`} character={character} isFirst={at === 0} />
                ))}
                {cluster.glyphs.map((glyph, at) => (
                  <View key={`g${at}`}>
                    <GlyphIdRow glyphId={glyph.id} renderer={renderer} />
                    <Row term="Offset" value={`(${glyph.x}, ${glyph.y})`} isMono />
                    <Row term="Advance" value={String(glyph.advance)} isMono />
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  input: { ...inputStyle, height: undefined, backgroundColor: colors.inputBackground },
  urdu: { fontFamily: naskh, minHeight: 104, paddingVertical: 6, fontSize: 22, fontWeight: '400', textAlign: 'right', writingDirection: 'rtl', textAlignVertical: 'top' },
  tags: { flexDirection: 'row', gap: 10 },
  tag: { ...inputStyle, fontFamily: mono },
  list: { marginTop: -6 },
  cluster: { paddingVertical: 10 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  clusterTitle: { height: 28, fontSize: 13, fontWeight: '600', color: colors.label },
  row: { height: 32, flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  term: { width: 96, fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.muted },
  value: { fontSize: 15, color: colors.text, textAlign: 'left' },
  glyphRow: { height: 48 },
  glyphContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  character: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  shown: { fontFamily: naskh, fontSize: 18, color: colors.text },
  mono: { fontFamily: mono, fontSize: 14 },
});
