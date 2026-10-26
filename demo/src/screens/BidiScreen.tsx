import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BaseDirection, BidiAlgorithm, initialize } from 'tehreer-react-native';
import type { BidiRun } from 'tehreer-react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Message } from '../components/Message';
import { Mono } from '../components/Mono';
import { Page } from '../components/Page';
import { Section } from '../components/Section';
import { Segmented } from '../components/Segmented';
import { colors } from '../theme/colors';
import { naskh } from '../theme/naskh';
import { inputStyle } from '../theme/inputStyle';

type Direction = 'auto' | 'ltr' | 'rtl';

interface Run {
  readonly start: number;
  readonly end: number;
  readonly level: number;
  readonly text: string;
}

interface Paragraph {
  readonly level: number;
  readonly logical: Run[];
  readonly visual: Run[];
}

const BASE_DIRECTIONS: Record<Direction, BaseDirection> = {
  auto: BaseDirection.DefaultLeftToRight,
  ltr: BaseDirection.LeftToRight,
  rtl: BaseDirection.RightToLeft,
};
const DEFAULT_TEXT = 'The word مرحبا means hello';
const isRtl = (level: number) => level % 2 === 1;
const printable = (text: string) => text.replace(/[\r\n\u2029]/g, '↵');

function resolve(text: string, direction: Direction): Paragraph[] {
  initialize();
  const paragraphs: Paragraph[] = [];
  const algorithm = new BidiAlgorithm(text);
  try {
    let start = 0;
    while (start < text.length) {
      const end = algorithm.getParagraphBoundary(start, text.length);
      const paragraph = algorithm.createParagraph(start, end, BASE_DIRECTIONS[direction]);
      try {
        const line = paragraph.createLine(paragraph.startIndex, paragraph.endIndex);
        try {
          const toRun = (run: BidiRun): Run => ({
            start: run.startIndex,
            end: run.endIndex,
            level: run.embeddingLevel,
            text: text.slice(run.startIndex, run.endIndex),
          });
          paragraphs.push({
            level: paragraph.baseLevel,
            logical: [...paragraph.logicalRuns].map(toRun),
            visual: line.visualRuns.toArray().map(toRun),
          });
        } finally {
          line.dispose();
        }
        start = paragraph.endIndex;
      } finally {
        paragraph.dispose();
      }
    }
  } finally {
    algorithm.dispose();
  }
  return paragraphs;
}

export function BidiScreen({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [direction, setDirection] = useState<Direction>('auto');
  const [applied, setApplied] = useState({ text: DEFAULT_TEXT, direction: 'auto' as Direction });
  const [problem, setProblem] = useState<string | undefined>();

  const apply = () => {
    if (text.length === 0) {
      setProblem('Please write something!');
    } else {
      setProblem(undefined);
      setApplied({ text, direction });
    }
  };

  const result = useMemo(() => {
    try {
      return { paragraphs: resolve(applied.text, applied.direction), error: undefined };
    } catch (e) {
      return { paragraphs: undefined, error: e instanceof Error ? e.message : String(e) };
    }
  }, [applied]);

  return (
    <Page title="Bidirectional Algorithm" onBack={onBack}>
      <Card>
        <Field label="Input text">
          <TextInput
            multiline
            onChangeText={setText}
            style={styles.input}
            testID="bidiInput"
            value={text}
          />
        </Field>
        <Field label="Paragraph direction">
          <Segmented
            onChange={setDirection}
            options={[{ value: 'auto', label: 'Auto' }, { value: 'ltr', label: 'LTR' }, { value: 'rtl', label: 'RTL' }]}
            value={direction}
          />
        </Field>
        {problem !== undefined && <Message tone="error">{problem}</Message>}
        <Button label="Resolve" onPress={apply} testID="bidiResolve" />
      </Card>

      {result.error !== undefined && <Message tone="error">{result.error}</Message>}
      {result.paragraphs?.map((paragraph, index) => (
        <View key={index} style={styles.results}>
          <Section
            meta={`Base ${paragraph.level} · ${isRtl(paragraph.level) ? 'RTL' : 'LTR'}`}
            title={result.paragraphs!.length > 1 ? `Resolved runs · paragraph ${index + 1}` : 'Resolved runs'}
          >
            <View style={styles.runs}>
              {paragraph.logical.map((run, runIndex) => (
                <View key={run.start} style={[styles.runRow, runIndex < paragraph.logical.length - 1 && styles.runRule]}>
                  <Mono style={styles.cRange}>{`${run.start} – ${run.end - 1}`}</Mono>
                  <Mono style={styles.cLevel}>{run.level}</Mono>
                  <Text style={[styles.cDir, { color: isRtl(run.level) ? colors.rtl : colors.ltr }]}>{isRtl(run.level) ? 'RTL' : 'LTR'}</Text>
                  <Text style={[styles.cText, isRtl(run.level) && styles.cTextRtl, { writingDirection: isRtl(run.level) ? 'rtl' : 'ltr' }]}>{printable(run.text)}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Visual order">
            <View style={styles.visual}>
              {paragraph.visual.map((run) => (
                <View key={run.start} style={[styles.visualRun, { borderBottomColor: isRtl(run.level) ? colors.rtl : colors.ltr }]}>
                  <Text style={[styles.visualText, isRtl(run.level) && { fontFamily: naskh }, { writingDirection: isRtl(run.level) ? 'rtl' : 'ltr' }]}>
                    {run.text.replace(/[\r\n\u2029]/g, '')}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: colors.ltr }]} />
                <Text style={styles.legendText}>Level 0 · LTR</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: colors.rtl }]} />
                <Text style={styles.legendText}>Level 1 · RTL</Text>
              </View>
            </View>
          </Section>
        </View>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  input: { ...inputStyle, minHeight: 78, height: undefined, paddingVertical: 10, backgroundColor: colors.inputBackground, fontSize: 20, fontWeight: '400', textAlignVertical: 'top' },
  results: { gap: 12 },
  runs: { marginTop: -6 },
  runRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
  runRule: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  cRange: { width: 56, color: colors.label },
  cLevel: { width: 14 },
  cDir: { width: 34, fontSize: 13, fontWeight: '700' },
  cText: { flex: 1, fontSize: 16, color: colors.text, textAlign: 'left' },
  cTextRtl: { fontFamily: naskh, fontSize: 20 },
  visual: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  visualRun: { borderBottomWidth: 3, paddingBottom: 3 },
  visualText: { fontSize: 19, lineHeight: 28, color: colors.text },
  legend: { flexDirection: 'row', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 16, height: 3 },
  legendText: { fontSize: 13, color: colors.label },
});
