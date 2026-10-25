import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ShapingEngine, SfntTag } from 'tehreer-react-native';
import type { Typeface } from 'tehreer-react-native';
import { FontChoice } from './FontChoice';
import { TEXT_FONTS, useTypeface } from './fonts';
import { Button, Card, Label, Message, Mono, Page, colors } from './ui';

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

interface Cluster {
  readonly characters: string[];
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

function describe(character: string): string {
  const code = hex(character.codePointAt(0)!);
  return character === ' ' ? `${code} (space)` : `${code} (\u2066${character}\u2069)`;
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

        const characters: string[] = [];
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

export function ShapingScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState('mehr');
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
    <Page title="OpenType Shaping" summary="Shape text with script and language tags, then inspect each glyph's ID, offset and advance." onBack={onBack}>
      <Card title="Settings">
        <FontChoice onChange={setFontId} options={TEXT_FONTS} value={fontId} />
        <Label>Type size</Label>
        <TextInput inputMode="numeric" onChangeText={setSize} style={styles.input} testID="shapingSize" value={size} />
        <Label>Script tag</Label>
        <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setScript} style={styles.input} testID="shapingScript" value={script} />
        <Label>Language tag</Label>
        <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setLanguage} style={styles.input} testID="shapingLanguage" value={language} />
        <Label>Input text</Label>
        <TextInput multiline onChangeText={setText} style={[styles.input, styles.urdu]} testID="shapingText" value={text} />
        {problem !== undefined && <Message tone="error">{problem}</Message>}
        <Button label="Shape" onPress={apply} testID="shapingShape" />
      </Card>

      <Card title="OpenType Info" meta="Grouped by cluster">
        {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
        {typeof clusters === 'string' && <Message tone="error">{clusters}</Message>}
        {Array.isArray(clusters) && (
          <>
            <View style={styles.head}>
              <Text style={[styles.th, styles.cChar]}>Character</Text>
              <Text style={[styles.th, styles.cGlyph]}>Glyph ID</Text>
              <Text style={[styles.th, styles.cOffset]}>Offset</Text>
              <Text style={[styles.th, styles.cAdvance]}>Advance</Text>
            </View>
            {clusters.map((cluster, index) => {
              const rows = Math.max(cluster.characters.length, cluster.glyphs.length);
              return (
                <View key={index} style={styles.cluster}>
                  {Array.from({ length: rows }, (_, row) => {
                    const glyph = cluster.glyphs[row];
                    return (
                      <View key={row} style={styles.line}>
                        <Mono style={styles.cChar}>{cluster.characters[row] ?? ''}</Mono>
                        <Mono style={styles.cGlyph}>{glyph ? hex(glyph.id) : ''}</Mono>
                        <Mono style={styles.cOffset}>{glyph ? `(${glyph.x}, ${glyph.y})` : ''}</Mono>
                        <Mono style={styles.cAdvance}>{glyph ? String(glyph.advance) : ''}</Mono>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 16, color: colors.text },
  urdu: { minHeight: 64, textAlign: 'right', writingDirection: 'rtl', textAlignVertical: 'top' },
  head: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 },
  th: { fontSize: 12, fontWeight: '600', color: colors.muted },
  cluster: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1 },
  cChar: { width: 92, fontSize: 12 },
  cGlyph: { width: 56, fontSize: 12 },
  cOffset: { flex: 1, fontSize: 12 },
  cAdvance: { width: 56, fontSize: 12, textAlign: 'right' },
});
