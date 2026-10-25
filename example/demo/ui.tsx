import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#F4F6F2',
  card: '#FFFFFF',
  border: '#D9E0D6',
  text: '#111A14',
  muted: '#5C6B60',
  accent: '#00A100',
  accentDark: '#007A00',
  rtl: '#B3261E',
  ltr: '#1A56C4',
};

export const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** A screen: a header with a back button, then the scrolling content. */
export function Page({ title, summary, onBack, scroll = true, children }: {
  title: string;
  summary?: string;
  onBack: () => void;
  /** False for a screen whose content scrolls by itself (a list or a text view). */
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.page}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={onBack} style={styles.back} testID="demoBack">
          <Text style={styles.backText}>{'‹ Back'}</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.barTitle}>{title}</Text>
        <View style={styles.back} />
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {summary !== undefined && <Text style={styles.summary}>{summary}</Text>}
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>
          {summary !== undefined && <Text style={styles.summary}>{summary}</Text>}
          {children}
        </View>
      )}
    </View>
  );
}

export function Card({ title, meta, children, style }: { title?: string; meta?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      {(title !== undefined || meta !== undefined) && (
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{title}</Text>
          {meta !== undefined && <Text style={styles.meta}>{meta}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function Message({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return <Text style={[styles.message, tone === 'error' && { color: colors.rtl }]}>{children}</Text>;
}

export function Button({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]} testID={testID}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

/** One choice out of a few, as a row of pills. */
export function Choice<T extends string | number>({ options, value, onChange }: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choice}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.pill, selected && styles.pillSelected]}
            testID={`choice-${String(option.value)}`}
          >
            <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A slider, as React Native has none without a dependency. `onChange` follows the finger and
 * `onComplete` is called when it lifts, like the Android demo that resizes when the thumb is released.
 */
export function Slider({ min, max, step, value, onChange, onStart, onComplete, testID }: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  onStart?: () => void;
  onComplete?: (value: number) => void;
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  // The responder callbacks outlive a render, so they read the latest props from here.
  const latest = useRef({ min, max, step, width, onChange, onStart, onComplete });
  latest.current = { min, max, step, width, onChange, onStart, onComplete };
  // Where the finger went down and the value it gave last; the children ignore touches, so
  // locationX is relative to the track and the distance moved adds to it.
  const startX = useRef(0);
  const current = useRef(value);
  current.current = value;

  const valueAt = (x: number) => {
    const { min: low, max: high, step: unit, width: span } = latest.current;
    const fraction = span <= 0 ? 0 : Math.min(1, Math.max(0, x / span));
    const stepped = Math.round((low + fraction * (high - low)) / unit) * unit;
    return Math.min(high, Math.max(low, stepped));
  };
  const moveTo = (x: number) => {
    const next = valueAt(x);
    if (next !== current.current) {
      current.current = next;
      latest.current.onChange(next);
    }
  };

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // Inside a ScrollView the slider keeps the gesture once it has it.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      latest.current.onStart?.();
      startX.current = event.nativeEvent.locationX;
      moveTo(startX.current);
    },
    onPanResponderMove: (_event, gesture) => moveTo(startX.current + gesture.dx),
    onPanResponderRelease: () => latest.current.onComplete?.(current.current),
    onPanResponderTerminate: () => latest.current.onComplete?.(current.current),
  })).current;

  const ratio = max === min ? 0 : (value - min) / (max - min);
  return (
    <View
      {...responder.panHandlers}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={styles.sliderTrackArea}
      testID={testID}
    >
      <View pointerEvents="none" style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[styles.sliderThumb, { left: ratio * width - 11 }]} />
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

/** A name and its value on one line, for the typeface information. */
export function Definition({ term, value }: { term: string; value: string | number | undefined }) {
  return (
    <View style={styles.definition}>
      <Text style={styles.term}>{term}</Text>
      <Text style={styles.value}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 10, paddingHorizontal: 12, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  back: { width: 72 },
  backText: { fontSize: 17, color: colors.accentDark },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.text },
  fixed: { flex: 1, padding: 16, gap: 14 },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  summary: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 14, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.muted },
  message: { fontSize: 14, color: colors.muted },
  button: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  choice: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.card },
  pillSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 14, color: colors.text },
  pillTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  sliderTrackArea: { height: 36, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: colors.accent },
  sliderThumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, top: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mono: { fontFamily: mono, fontSize: 13, color: colors.text },
  definition: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 12 },
  term: { fontSize: 14, color: colors.muted },
  value: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
});
