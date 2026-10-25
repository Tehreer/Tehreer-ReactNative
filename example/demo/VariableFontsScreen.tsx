import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SfntTag, TLabel } from 'tehreer-react-native';
import type { Typeface } from 'tehreer-react-native';
import { FontChoice } from './FontChoice';
import { VARIABLE_FONTS, useFontFile } from './fonts';
import { Card, Label, Choice, Message, Page, Slider, colors } from './ui';

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

  // The instances that the sliders and the palette make are owned here; they are disposed a moment
  // after the next one is shown.
  const [typeface, setTypeface] = useState<Typeface>();
  useEffect(() => {
    if (base === undefined) {
      setTypeface(undefined);
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
    setTypeface(current);
    return () => {
      setTimeout(() => owned.forEach((item) => item.dispose()), 300);
    };
  }, [base, edited, palettes, paletteIndex]);

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

  return (
    <Page title="Variable Fonts" summary="Adjust axes, pick instances and swap colour palettes." onBack={onBack}>
      {font.error !== undefined && <Message tone="error">{`Could not load the font: ${font.error.message}`}</Message>}
      {typeface === undefined && font.error === undefined && <Message>Loading the font...</Message>}
      {typeface !== undefined && (
        <Card style={styles.preview}>
          {PREVIEW_LINES.map((line) => (
            <TLabel key={line} lineHeightMultiplier={1.1} text={line} textColor="#171915" textSize={34} typeface={typeface} />
          ))}
        </Card>
      )}

      <Card title="Controls">
        <FontChoice onChange={changeFont} options={VARIABLE_FONTS} value={fontId} />

        {instanceNames.length > 1 && (
          <>
            <Label>Instance</Label>
            <Choice onChange={changeInstance} options={instanceNames.map((name, index) => ({ value: index, label: name }))} value={instanceIndex} />
          </>
        )}

        {palettes.length > 0 && (
          <>
            <Label>Palette</Label>
            {palettes.length > 1 && (
              <Choice
                onChange={setPaletteIndex}
                options={palettes.map((palette, index) => ({ value: index, label: palette.name ?? `Palette ${index + 1}` }))}
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
          </>
        )}

        {axes.map(({ axis, index }) => {
          const value = coordinates[index] ?? axis.defaultValue;
          return (
            <View key={`${fontId}-${instanceIndex}-${axis.tag}`}>
              <View style={styles.axisHead}>
                <Label>{axis.name ?? SfntTag.toString(axis.tag)}</Label>
                <Text style={styles.axisValue}>{value.toFixed(1)}</Text>
              </View>
              <Slider max={axis.maxValue} min={axis.minValue} onChange={(next) => setCoordinate(index, next)} step={0.1} testID={`axis-${SfntTag.toString(axis.tag).trim()}`} value={value} />
              <View style={styles.axisRange}>
                <Text style={styles.axisValue}>{axis.minValue.toFixed(1)}</Text>
                <Text style={styles.axisValue}>{axis.maxValue.toFixed(1)}</Text>
              </View>
            </View>
          );
        })}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'flex-start' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chip: { width: 16, height: 16, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  swatchText: { fontSize: 11, color: colors.muted },
  axisHead: { flexDirection: 'row', justifyContent: 'space-between' },
  axisRange: { flexDirection: 'row', justifyContent: 'space-between' },
  axisValue: { fontSize: 12, color: colors.muted },
});
