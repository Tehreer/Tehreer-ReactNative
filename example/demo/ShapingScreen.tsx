import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ShapingEngine, SfntTag } from 'tehreer-react-native';
import type { Typeface } from 'tehreer-react-native';
import { FontChoice } from './FontChoice';
import { DEFAULT_TEXT_FONT, TEXT_FONTS, useTypeface } from './fonts';
import { Button, Card, Field, Message, Page, Section, colors, inputStyle, mono } from './ui';

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

/** One field of a cluster: the same height and spacing for every row, the name on the left and the value on the right. */
function Row({ term, value, isMono = false }: { term: string; value: string; isMono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.term}>{term}</Text>
      <Text style={[styles.value, isMono && styles.mono]}>{value}</Text>
    </View>
  );
}

export function ShapingScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState(DEFAULT_TEXT_FONT);
  const { typeface, error } = useTypeface(fontId);

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
                  <Row key={`c${at}`} term="Character" value={`${character.shown}   U+${character.code}`} />
                ))}
                {cluster.glyphs.map((glyph, at) => (
                  <View key={`g${at}`}>
                    <Row term="GID" value={hex(glyph.id)} isMono />
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
  urdu: { minHeight: 104, paddingVertical: 6, fontSize: 22, fontWeight: '400', textAlign: 'right', writingDirection: 'rtl', textAlignVertical: 'top' },
  tags: { flexDirection: 'row', gap: 10 },
  tag: { ...inputStyle, fontFamily: mono },
  list: { marginTop: -6 },
  cluster: { paddingVertical: 10 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  clusterTitle: { height: 28, fontSize: 13, fontWeight: '600', color: colors.label },
  row: { height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  term: { fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.muted },
  value: { fontSize: 15, color: colors.text },
  mono: { fontFamily: mono, fontSize: 14 },
});
