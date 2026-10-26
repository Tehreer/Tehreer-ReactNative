import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SfntTag, TLabel } from 'tehreer-react-native';
import type { Typeface } from 'tehreer-react-native';
import { FontChoice } from '../components/FontChoice';
import { VARIABLE_FONTS } from '../fonts/fonts';
import { useFontFile } from '../hooks/useFontFile';
import { Card } from '../components/Card';
import { Label } from '../components/Label';
import { Message } from '../components/Message';
import { Page } from '../components/Page';
import { Segmented } from '../components/Segmented';
import { Select } from '../components/Select';
import { Slider } from '../components/Slider';
import { colors } from '../theme/colors';
import { mono } from '../theme/mono';

const PREVIEW_LINES = ['ABCDEFGHIJK', 'LMNOPQRSTU', 'VWXYZ', '0123456789'];

const toHex = (color: number) => `#${(color & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;

export function VariableFontsScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState('rocher');
  const font = useFontFile(fontId);
  const file = font.value;

  const [instanceIndex, setInstanceIndex] = useState(0);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [edited, setEdited] = useState<readonly number[] | undefined>();

  const base = useMemo(() => file?.typefaces.at(instanceIndex) ?? file?.typefaces.get(0), [file, instanceIndex]);
  const instanceNames = useMemo(
    () => file?.typefaces.toArray().map((candidate, index) => candidate.styleName ?? `Instance ${index + 1}`) ?? [],
    [file],
  );
  const axes = useMemo(
    () => (base ? base.variationAxes.toArray().map((axis, index) => ({ axis, index })).filter(({ axis }) => !axis.isHidden) : []),
    [base],
  );
  const palettes = useMemo(
    () => (base ? base.predefinedPalettes.toArray().map((palette) => ({ name: palette.name, colors: palette.colors.toArray() })) : []),
    [base],
  );
  const coordinates = edited ?? (base ? base.variationCoordinates.toArray() : []);

  // The instances that the sliders and the palette make are owned here; they are disposed by the
  // effect below, after React has committed the render that shows the next one.
  const [shown, setShown] = useState<{ typeface: Typeface | undefined; owned: Typeface[] }>({ typeface: undefined, owned: [] });
  const typeface = shown.typeface;
  useEffect(() => {
    if (base === undefined) {
      setShown({ typeface: undefined, owned: [] });
      return;
    }
    const owned: Typeface[] = [];
    let current = base;
    if (edited !== undefined) {
      const varied = current.getVariationInstance(edited);
      if (varied !== undefined) {
        owned.push(varied);
        current = varied;
      }
    }
    const palette = palettes[paletteIndex];
    if (palette !== undefined && paletteIndex > 0) {
      const colored = current.getColorInstance(palette.colors);
      if (colored !== undefined) {
        owned.push(colored);
        current = colored;
      }
    }
    setShown({ typeface: current, owned });
  }, [base, edited, palettes, paletteIndex]);

  useEffect(() => () => shown.owned.forEach((item) => item.dispose()), [shown]);

  const changeFont = (id: string) => {
    setFontId(id);
    setInstanceIndex(0);
    setPaletteIndex(0);
    setEdited(undefined);
  };

  const changeInstance = (index: number) => {
    setInstanceIndex(index);
    setPaletteIndex(0);
    setEdited(undefined);
  };

  const setCoordinate = (axisIndex: number, value: number) => {
    const next = [...coordinates];
    next[axisIndex] = value;
    setEdited(next);
  };

  const shownPalette = palettes[paletteIndex] ?? palettes[0];

  const isLoading = typeface === undefined && font.error === undefined;

  return (
    <Page title="Variable Fonts" onBack={onBack}>
      {font.error !== undefined && <Message tone="error">{`Could not load the font: ${font.error.message}`}</Message>}
      <Card style={styles.controls}>
        <View style={styles.pair}>
          <View style={styles.half}>
            <FontChoice disabled={isLoading} onChange={changeFont} options={VARIABLE_FONTS} value={fontId} />
          </View>
          <View style={styles.half}>
            <Select
              disabled={instanceNames.length <= 1}
              label="Instance"
              onChange={changeInstance}
              options={instanceNames.map((name, index) => ({ value: index, label: name }))}
              testID="instanceSelect"
              value={instanceIndex}
            />
          </View>
        </View>

        {palettes.length > 0 && (
          <>
            <View style={styles.rule} />
            <View style={styles.palette}>
              <Label>Palette</Label>
              {palettes.length > 1 && (
                <Segmented
                  onChange={setPaletteIndex}
                  options={palettes.map((palette, index) => ({ value: index, label: palette.name ?? `${index + 1}` }))}
                  value={paletteIndex}
                />
              )}
              <View style={styles.swatches}>
                {shownPalette?.colors.map((color, index) => (
                  <View key={index} style={styles.swatch}>
                    <View style={[styles.chip, { backgroundColor: toHex(color) }]} />
                    <Text style={styles.swatchText}>{toHex(color).slice(1)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {axes.map(({ axis, index }) => {
          const value = coordinates[index] ?? axis.defaultValue;
          return (
            <View key={`${fontId}-${instanceIndex}-${axis.tag}`} style={{ gap: 14 }}>
              <View style={styles.rule} />
              <View>
                <View style={styles.axisHead}>
                  <Label>{axis.name ?? SfntTag.toString(axis.tag)}</Label>
                  <Text style={styles.axisValue}>{value.toFixed(1)}</Text>
                </View>
                <Slider max={axis.maxValue} min={axis.minValue} onChange={(next) => setCoordinate(index, next)} step={0.1} testID={`axis-${SfntTag.toString(axis.tag).trim()}`} value={value} />
                <View style={styles.axisRange}>
                  <Text style={styles.axisBound}>{axis.minValue.toFixed(1)}</Text>
                  <Text style={styles.axisBound}>{axis.maxValue.toFixed(1)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={styles.preview}>
        {isLoading && <Message>Loading the font…</Message>}
        {typeface !== undefined && PREVIEW_LINES.map((line) => (
          <TLabel key={line} lineHeightMultiplier={1.1} text={line} textColor="#171915" textSize={34} typeface={typeface} />
        ))}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 14 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, minWidth: 0 },
  rule: { height: 1, backgroundColor: colors.divider, marginHorizontal: -16 },
  palette: { gap: 8 },
  swatches: { flexDirection: 'row', gap: 12, paddingHorizontal: 2 },
  swatch: { flex: 1, alignItems: 'center', gap: 4 },
  chip: { width: '100%', height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder },
  swatchText: { fontFamily: mono, fontSize: 11, color: colors.label },
  axisHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  axisValue: { fontFamily: mono, fontSize: 13, fontWeight: '500', color: colors.text },
  axisRange: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  axisBound: { fontFamily: mono, fontSize: 11, color: colors.muted },
  preview: { paddingVertical: 12, alignItems: 'flex-start', gap: 0 },
});
