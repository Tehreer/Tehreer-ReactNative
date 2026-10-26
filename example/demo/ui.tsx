import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, TextStyle, ViewStyle } from 'react-native';

/** The colors of the mockups of the demo. */
export const colors = {
  background: '#F4F7F4',
  card: '#FFFFFF',
  border: '#E0E8E1',
  divider: '#E9EFEA',
  inputBorder: '#C9D6CC',
  inputBackground: '#FAFCFA',
  text: '#111A14',
  label: '#3F4E44',
  muted: '#55655A',
  disabled: '#8A988F',
  primary: '#1B4D2E',
  pressed: '#EDF3EE',
  skeleton: '#EDF3EE',
  ltr: '#1B4D2E',
  rtl: '#A8530C',
  link: '#1A56C4',
  error: '#B3261E',
};

/** The system monospace font, for numbers and IDs. */
export const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

// React Native has no safe-area hook without a library, so the status bar is allowed for by hand.
// The bar of a screen is as tall as the mockup's (60) below this.
export const TOP_INSET = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight ?? 24);

const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#111A14', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  default: { elevation: 1 },
}) ?? {};

type Direction = 'left' | 'right' | 'down';

/** A chevron made of two borders, as React Native has no icon set without a library. */
export function Chevron({ direction, color, size = 10, width = 2 }: { direction: Direction; color: string; size?: number; width?: number }) {
  const sides: ViewStyle = direction === 'left'
    ? { borderLeftWidth: width, borderBottomWidth: width, transform: [{ rotate: '45deg' }] }
    : direction === 'right'
      ? { borderRightWidth: width, borderBottomWidth: width, transform: [{ rotate: '-45deg' }] }
      : { borderRightWidth: width, borderBottomWidth: width, transform: [{ rotate: '45deg' }] };
  return <View style={[{ width: size, height: size, borderColor: color }, sides]} />;
}

function CloseIcon({ color }: { color: string }) {
  const bar: ViewStyle = { position: 'absolute', left: 3, top: 10, width: 16, height: 2, borderRadius: 1, backgroundColor: color };
  return (
    <View style={{ width: 22, height: 22 }}>
      <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

/** The green bar of a screen: the button on the left (back or close) and the title. */
export function AppBar({ title, onBack, icon = 'back' }: { title: string; onBack: () => void; icon?: 'back' | 'close' }) {
  return (
    <View style={styles.bar}>
      <StatusBar barStyle="light-content" />
      <Pressable
        accessibilityLabel={icon === 'back' ? 'Back' : 'Close'}
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.barButton, pressed && { backgroundColor: 'rgba(255,255,255,0.16)' }]}
        testID={icon === 'back' ? 'demoBack' : 'demoCloseSheet'}
      >
        {icon === 'back' ? <View style={{ marginLeft: 4 }}><Chevron color="#FFFFFF" direction="left" size={13} /></View> : <CloseIcon color="#FFFFFF" />}
      </Pressable>
      <Text numberOfLines={1} style={styles.barTitle}>{title}</Text>
    </View>
  );
}

/** A screen: the green app bar with the back chevron, then the content. */
export function Page({ title, onBack, scroll = true, children }: {
  title: string;
  onBack: () => void;
  /** False for a screen whose content scrolls by itself (a list or a text view). */
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.page}>
      <AppBar onBack={onBack} title={title} />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>{children}</View>
      )}
    </View>
  );
}

/** The duration of the slide of the sheets and the pages, in milliseconds. */
export const SLIDE_IN = 280;
export const SLIDE_OUT = 220;

/** Moves `progress` to a value with the easing of an entrance (decelerating) or an exit (accelerating). */
export function slide(progress: Animated.Value, toValue: 0 | 1, callback?: (finished: boolean) => void) {
  Animated.timing(progress, {
    toValue,
    duration: toValue === 1 ? SLIDE_IN : SLIDE_OUT,
    easing: toValue === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    useNativeDriver: true,
  }).start(({ finished }) => callback?.(finished));
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A card with a heading, and optionally a note in monospace on the right of it. */
export function Section({ title, meta, children, style }: { title: string; meta?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={[{ gap: 12 }, style]}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {meta !== undefined && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {children}
    </Card>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

/** A label above a control. */
export function Field({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

export function Message({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return <Text style={[styles.message, tone === 'error' && { color: colors.error }]}>{children}</Text>;
}

/** The solid green button. */
export function Button({ label, onPress, testID, style }: { label: string; onPress: () => void; testID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && { opacity: 0.8 }]}
      testID={testID}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

/** One choice out of a few, as a joined row of segments. */
export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.segment, index > 0 && styles.segmentDivider, selected && styles.segmentSelected]}
            testID={`choice-${String(option.value)}`}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A dropdown: a field that opens a bottom sheet with the choices. It is built of core components
 * (`Modal`), as the library has no picker; the back button of Android closes the sheet.
 */
export function Select<T extends string | number>({ label, options, value, onChange, disabled = false, testID }: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  testID?: string;
}) {
  // The sheet and the dimmer animate apart from one progress: the dimmer fades and the sheet slides.
  // The modal stays mounted until the exit has finished.
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const { height: windowHeight } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(windowHeight);
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (mounted) {
      slide(progress, 1);
    }
  }, [mounted, progress]);

  const show = () => {
    closing.current = false;
    progress.setValue(0);
    setMounted(true);
  };
  const hide = () => {
    if (closing.current) {
      return;
    }
    closing.current = true;
    slide(progress, 0, (finished) => finished && setMounted(false));
  };

  return (
    <Field label={label}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={show}
        style={styles.select}
        testID={testID}
      >
        <Text numberOfLines={1} style={[styles.selectText, disabled && { color: colors.disabled }]}>{current?.label ?? ''}</Text>
        <View style={styles.selectChevron}>
          <Chevron color={colors.muted} direction="down" size={9} width={1.75} />
        </View>
      </Pressable>
      <Modal animationType="none" onRequestClose={hide} statusBarTranslucent transparent visible={mounted}>
        <View style={styles.sheetHost}>
          <Animated.View style={[styles.backdrop, { opacity: progress }]}>
            <Pressable accessibilityLabel="Close" onPress={hide} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View
            onLayout={(event: LayoutChangeEvent) => setSheetHeight(event.nativeEvent.layout.height)}
            style={[styles.sheet, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }) }] }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map((option, index) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={String(option.value)}
                    onPress={() => {
                      hide();
                      if (!selected) {
                        onChange(option.value);
                      }
                    }}
                    style={({ pressed }) => [styles.option, index > 0 && styles.optionDivider, pressed && { backgroundColor: colors.pressed }]}
                    testID={`option-${String(option.value)}`}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                    {selected && <Text style={styles.check}>{'✓'}</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </Field>
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

export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

/** The rows of a section, pulled up towards its heading as in the mockups. */
export function Rows({ children }: { children: ReactNode }) {
  return <View style={{ marginTop: -6 }}>{children}</View>;
}

/** A name and its value on one line, with a rule under it unless it is the last. */
export function Definition({ term, value, isMono = false, isLast = false }: {
  term: string;
  value: string | number | undefined;
  /** For numbers, IDs and codes. */
  isMono?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.definition, !isLast && styles.definitionRule]}>
      <Text style={styles.term}>{term}</Text>
      <Text style={[styles.value, isMono && styles.valueMono]}>{value ?? '—'}</Text>
    </View>
  );
}

/** The style of a text field of the mockups. */
export const inputStyle: TextStyle = {
  borderWidth: 1,
  borderColor: colors.inputBorder,
  borderRadius: 10,
  backgroundColor: colors.card,
  color: colors.text,
  fontSize: 16,
  fontWeight: '500',
  height: 48,
  paddingHorizontal: 12,
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 60 + TOP_INSET, paddingTop: TOP_INSET, paddingLeft: 4, paddingRight: 8, backgroundColor: colors.primary },
  barButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, fontSize: 19, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.1 },
  fixed: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 12 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 16, gap: 14, ...cardShadow },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontFamily: mono, fontSize: 12, color: colors.muted },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.label },
  message: { fontSize: 15, color: colors.label },
  button: { height: 50, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.card },
  segment: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: colors.inputBorder },
  segmentSelected: { backgroundColor: colors.primary },
  segmentText: { fontSize: 15, fontWeight: '500', color: colors.text },
  segmentTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  select: { height: 48, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, backgroundColor: colors.card, justifyContent: 'center', paddingLeft: 14, paddingRight: 44 },
  selectText: { fontSize: 16, fontWeight: '500', color: colors.text },
  selectChevron: { position: 'absolute', right: 16, top: 14, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingBottom: 3 },
  sheetHost: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,26,20,0.45)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '65%', paddingTop: 8, paddingBottom: 24 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.inputBorder, marginBottom: 12 },
  sheetTitle: { fontSize: 13, fontWeight: '600', color: colors.label, paddingHorizontal: 20, paddingBottom: 8 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20 },
  optionDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  optionText: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  check: { fontSize: 18, fontWeight: '700', color: colors.primary },
  sliderTrackArea: { height: 36, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: '#D5E3D8', overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: colors.primary },
  sliderThumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, top: 7 },
  mono: { fontFamily: mono, fontSize: 13, color: colors.text },
  definition: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, minHeight: 42, paddingVertical: 10 },
  definitionRule: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  term: { fontSize: 15, color: colors.label },
  value: { fontSize: 15, fontWeight: '500', color: colors.text, flexShrink: 1, textAlign: 'right' },
  valueMono: { fontFamily: mono, fontSize: 14, fontWeight: '400' },
});
