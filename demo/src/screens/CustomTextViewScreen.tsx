import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Color, TMutableText, TTextView, TextAlignment, initialize } from 'tehreer-react-native';
import { QURAN_FONT } from '../fonts/fonts';
import { useTypeface } from '../hooks/useTypeface';
import { SURAH, SURAH_TITLE } from '../data/surah';
import { Card } from '../components/Card';
import { Message } from '../components/Message';
import { Page } from '../components/Page';
import { Section } from '../components/Section';
import { Slider } from '../components/Slider';
import { colors } from '../theme/colors';
import { mono } from '../theme/mono';
import { useOwned } from '../hooks/useOwned';

const MIN_TEXT_SIZE = 24;
const MAX_TEXT_SIZE = 64;
const DEFAULT_TEXT_SIZE = 36;

interface Surah {
  readonly text: TMutableText;
  readonly ranges: readonly { fromIndex: number; toIndex: number }[];
}

/**
 * The verses one after another, as the Android demo makes them: a line break after the first verse
 * and two spaces after the others, with the colors of their words applied in order.
 */
function makeSurah(): Surah & { dispose(): void } {
  initialize();
  const ranges: { fromIndex: number; toIndex: number }[] = [];
  const text = new TMutableText('');
  SURAH.forEach((ayah, index) => {
    const offset = text.length;
    text.append(ayah.text);
    ranges.push({ fromIndex: offset, toIndex: offset + ayah.text.length });
    for (const attribute of ayah.attributes) {
      text.setAttributes(offset + attribute.start, offset + attribute.end, { foregroundColor: Color.parse(`#${attribute.color}`) });
    }
    text.append(index === 0 ? '\n' : '  ');
  });
  return { text, ranges, dispose: () => text.dispose() };
}

export function CustomTextViewScreen({ onBack }: { onBack: () => void }) {
  const { typeface, error } = useTypeface(QURAN_FONT.id);
  const surah = useOwned(makeSurah, []);
  const shown = useOwned(() => surah?.text.copy(), [surah]);
  const [size, setSize] = useState(DEFAULT_TEXT_SIZE);
  const [applied, setApplied] = useState(DEFAULT_TEXT_SIZE);
  const [selected, setSelected] = useState<number | undefined>();

  const highlights = useMemo(() => {
    const range = selected === undefined ? undefined : surah?.ranges[selected];
    return range === undefined ? [] : [range];
  }, [selected, surah]);

  // Like the Android demo, the verse is deselected when the slider is grabbed and the text is
  // resized when it is released.
  return (
    <Page title="Custom Text View" onBack={onBack} scroll={false}>
      <Card style={styles.size}>
        <View style={styles.sizeHead}>
          <Text style={styles.sizeLabel}>Text size</Text>
          <Text style={styles.sizeValue}>{`${size} px`}</Text>
        </View>
        <View style={styles.slider}>
          <Slider max={MAX_TEXT_SIZE} min={MIN_TEXT_SIZE} onChange={setSize} onComplete={setApplied} onStart={() => setSelected(undefined)} step={1} testID="textSize" value={size} />
        </View>
      </Card>
      <Section style={styles.surah} title={SURAH_TITLE}>
        {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
        {typeface !== undefined && shown !== undefined && (
          <TTextView
            attributedText={shown}
            contentInset={{ top: 4, left: 12, right: 12, bottom: 8 }}
            highlights={highlights}
            isJustificationEnabled
            lineHeightMultiplier={0.8}
            onTap={(index) => {
              const verse = index === undefined ? -1 : (surah?.ranges.findIndex((range) => index >= range.fromIndex && index < range.toIndex) ?? -1);
              setSelected((current) => (verse < 0 || verse === current ? undefined : verse));
            }}
            separatorColor="#C9D6CC"
            style={styles.textView}
            testID="surahView"
            textAlignment={TextAlignment.Center}
            textColor="#111A14"
            textSize={applied}
            typeface={typeface}
          />
        )}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  size: { gap: 8 },
  sizeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sizeLabel: { fontSize: 13, fontWeight: '600', color: colors.label },
  sizeValue: { fontFamily: mono, fontSize: 13, color: colors.text },
  slider: { marginTop: -6 },
  // The card keeps 4 of its 16 of side padding, so the scroll indicator is at the edge of the card and the 12 of the text view's inset keep the text where it was.
  surah: { flex: 1, minHeight: 0, overflow: 'hidden', paddingHorizontal: 4 },
  textView: { flex: 1 },
});
