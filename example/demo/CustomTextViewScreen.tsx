import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Color, TMutableText, TTextView, TextAlignment, initialize } from 'tehreer-react-native';
import { useTypeface } from './fonts';
import { SURAH, SURAH_TITLE } from './data/surah';
import { Card, Message, Page, Slider, colors } from './ui';
import { useOwned } from './useOwned';

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
  const { typeface, error } = useTypeface('noorehuda');
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
    <Page title="Custom Text View" summary="A text view for long, colour-annotated Arabic text with adjustable size. Tap a verse to select it." onBack={onBack} scroll={false}>
      <View style={styles.size}>
        <Text style={styles.sizeLabel}>Text size</Text>
        <View style={styles.slider}>
          <Slider max={MAX_TEXT_SIZE} min={MIN_TEXT_SIZE} onChange={setSize} onComplete={setApplied} onStart={() => setSelected(undefined)} step={1} testID="textSize" value={size} />
        </View>
        <Text style={styles.sizeValue}>{`${size} px`}</Text>
      </View>
      <Card style={styles.surah} title={SURAH_TITLE}>
        {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
        {typeface !== undefined && shown !== undefined && (
          <TTextView
            attributedText={shown}
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
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  size: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sizeLabel: { fontSize: 14, color: colors.muted },
  slider: { flex: 1 },
  sizeValue: { width: 56, fontSize: 13, color: colors.text, textAlign: 'right' },
  surah: { flex: 1 },
  textView: { flex: 1 },
});
