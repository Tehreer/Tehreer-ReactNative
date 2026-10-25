import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BaseDirection, BidiAlgorithm, initialize } from 'tehreer-react-native';
import type { BidiRun } from 'tehreer-react-native';
import { Button, Card, Choice, Label, Message, Mono, Page, colors } from './ui';

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
    <Page title="Bidirectional Algorithm" summary="Resolve embedding levels and visual runs of mixed-direction text." onBack={onBack}>
      <Card title="Input text">
        <TextInput
          multiline
          onChangeText={setText}
          style={styles.input}
          testID="bidiInput"
          value={text}
        />
        <Label>Paragraph direction</Label>
        <Choice
          onChange={setDirection}
          options={[{ value: 'auto', label: 'Auto' }, { value: 'ltr', label: 'LTR' }, { value: 'rtl', label: 'RTL' }]}
          value={direction}
        />
        {problem !== undefined && <Message tone="error">{problem}</Message>}
        <Button label="Resolve" onPress={apply} testID="bidiResolve" />
      </Card>

      {result.error !== undefined && <Message tone="error">{result.error}</Message>}
      {result.paragraphs?.map((paragraph, index) => (
        <View key={index} style={styles.results}>
          <Card
            title={result.paragraphs!.length > 1 ? `Resolved runs · paragraph ${index + 1}` : 'Resolved runs'}
            meta={`Base level ${paragraph.level} · ${isRtl(paragraph.level) ? 'RTL' : 'LTR'} · ${paragraph.logical.length} run${paragraph.logical.length === 1 ? '' : 's'}`}
          >
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.cRange]}>Range</Text>
              <Text style={[styles.th, styles.cLevel]}>Level</Text>
              <Text style={[styles.th, styles.cDir]}>Dir</Text>
              <Text style={[styles.th, styles.cText]}>Text</Text>
            </View>
            {paragraph.logical.map((run) => (
              <View key={run.start} style={styles.tableRow}>
                <Mono style={styles.cRange}>{`${run.start}–${run.end - 1}`}</Mono>
                <Mono style={styles.cLevel}>{run.level}</Mono>
                <Text style={[styles.cDir, { color: isRtl(run.level) ? colors.rtl : colors.ltr, fontWeight: '600' }]}>{isRtl(run.level) ? 'RTL' : 'LTR'}</Text>
                <Text style={[styles.cText, styles.runText, { writingDirection: isRtl(run.level) ? 'rtl' : 'ltr' }]}>{printable(run.text)}</Text>
              </View>
            ))}
          </Card>

          <Card title="Visual order">
            <View style={styles.visual}>
              {paragraph.visual.map((run) => (
                <Text
                  key={run.start}
                  style={[
                    styles.visualRun,
                    isRtl(run.level) ? styles.visualRtl : styles.visualLtr,
                    { writingDirection: isRtl(run.level) ? 'rtl' : 'ltr' },
                  ]}
                >
                  {run.text.replace(/[\r\n\u2029]/g, '')}
                </Text>
              ))}
            </View>
            <View style={styles.legend}>
              <Text style={[styles.legendItem, { color: colors.ltr }]}>{'■ Level 0 · LTR'}</Text>
              <Text style={[styles.legendItem, { color: colors.rtl }]}>{'■ Level 1 · RTL'}</Text>
            </View>
          </Card>
        </View>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 18, color: colors.text, textAlignVertical: 'top' },
  results: { gap: 14 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  th: { fontSize: 12, fontWeight: '600', color: colors.muted },
  cRange: { width: 64 },
  cLevel: { width: 44 },
  cDir: { width: 44, fontSize: 13 },
  cText: { flex: 1 },
  runText: { fontSize: 16, color: colors.text, textAlign: 'left' },
  visual: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  visualRun: { fontSize: 20, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden' },
  visualLtr: { color: colors.ltr, backgroundColor: '#E8EFFB' },
  visualRtl: { color: colors.rtl, backgroundColor: '#FBEAE9' },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { fontSize: 12 },
});
