import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { colors } from '../theme/colors';
import { slide } from '../theme/slide';
import { Chevron } from './Chevron';
import { Field } from './Field';

const SHEET_PADDING = 24;
// The window of a Modal draws under the Android navigation bar, and core React Native cannot measure
// it (the screen and window heights are the same). 48 dp is the height of the 3-button bar, the
// tallest one; gesture navigation only leaves a little more space. On iOS the sheet needs no inset
// beyond SHEET_PADDING, which already clears the home indicator.
const BOTTOM_INSET = Platform.OS === 'android' ? 48 : 0;

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
            style={[styles.sheet, { paddingBottom: SHEET_PADDING + BOTTOM_INSET, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }) }] }]}
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

const styles = StyleSheet.create({
  select: { height: 48, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, backgroundColor: colors.card, justifyContent: 'center', paddingLeft: 14, paddingRight: 44 },
  selectText: { fontSize: 16, fontWeight: '500', color: colors.text },
  selectChevron: { position: 'absolute', right: 16, top: 14, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingBottom: 3 },
  sheetHost: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,26,20,0.45)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '65%', paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.inputBorder, marginBottom: 12 },
  sheetTitle: { fontSize: 13, fontWeight: '600', color: colors.label, paddingHorizontal: 20, paddingBottom: 8 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20 },
  optionDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  optionText: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  check: { fontSize: 18, fontWeight: '700', color: colors.primary },
});
