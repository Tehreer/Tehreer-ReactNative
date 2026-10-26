import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Animated, BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BidiScreen } from './BidiScreen';
import { CustomLabelScreen } from './CustomLabelScreen';
import { CustomTextViewScreen } from './CustomTextViewScreen';
import { GlyphsScreen } from './GlyphsScreen';
import { HomeScreen } from './HomeScreen';
import type { ScreenEntry } from './HomeScreen';
import { ShapingScreen } from './ShapingScreen';
import { TypefaceInfoScreen } from './TypefaceInfoScreen';
import { VariableFontsScreen } from './VariableFontsScreen';
import { colors, slide } from './ui';

const SCREENS: readonly (ScreenEntry & { readonly component: ComponentType<{ onBack: () => void }> })[] = [
  { id: 'bidi', title: 'Bidirectional Algorithm', summary: 'Resolve embedding levels and visual runs.', component: BidiScreen },
  { id: 'typeface-info', title: 'Typeface Information', summary: 'Names and metrics of a loaded typeface.', component: TypefaceInfoScreen },
  { id: 'glyphs', title: 'Typeface Glyphs', summary: 'Browse every glyph by its glyph ID.', component: GlyphsScreen },
  { id: 'shaping', title: 'OpenType Shaping', summary: 'Inspect glyph IDs, offsets and advances.', component: ShapingScreen },
  { id: 'label', title: 'Custom Label', summary: 'Styled, mixed-script text in a label.', component: CustomLabelScreen },
  { id: 'text-view', title: 'Custom Text View', summary: 'Long, colour-annotated Arabic text.', component: CustomTextViewScreen },
  { id: 'variable-fonts', title: 'Variable Fonts', summary: 'Axes, instances and colour palettes.', component: VariableFontsScreen },
];

/**
 * The demo: the screens of the Tehreer-Web demo on `TLabel` and `TTextView`, using the public API of
 * the library only. Navigation is a piece of state, so the demo needs no navigation library.
 */
export function DemoApp({ onClose }: { onClose: () => void }) {
  // The home stays mounted below the screen that is open, so that it slides back into view on a pop.
  // `shown` is the screen that is mounted (it stays through the exit), `current` the one that is wanted.
  const [shown, setShown] = useState<string | undefined>();
  const current = useRef<string | undefined>(undefined);
  const progress = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  const open = useCallback((id: string) => {
    if (current.current !== undefined) {
      return;
    }
    current.current = id;
    progress.setValue(0);
    setShown(id);
  }, [progress]);

  const back = useCallback(() => {
    if (current.current === undefined) {
      return;
    }
    current.current = undefined;
    slide(progress, 0, (finished) => finished && setShown(undefined));
  }, [progress]);

  // A screen is pushed once it is mounted, so that the first frame is not laid out in the middle of the slide.
  useEffect(() => {
    if (shown !== undefined && current.current === shown) {
      slide(progress, 1);
    }
  }, [shown, progress]);

  useEffect(() => {
    // The back button of Android goes up one level, and leaves the demo from its home.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (current.current === undefined) {
        if (shown === undefined) {
          onClose();
        }
      } else {
        back();
      }
      return true;
    });
    return () => subscription.remove();
  }, [shown, back, onClose]);

  const screen = SCREENS.find((candidate) => candidate.id === shown);
  const Screen = screen?.component;
  return (
    <View style={styles.root}>
      <Animated.View
        accessibilityElementsHidden={screen !== undefined}
        importantForAccessibility={screen === undefined ? 'auto' : 'no-hide-descendants'}
        style={[styles.layer, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.25] }) }] }]}
      >
        <HomeScreen onClose={onClose} onOpen={open} screens={SCREENS} />
      </Animated.View>
      {Screen !== undefined && (
        <Animated.View style={[styles.layer, styles.screen, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) }] }]}>
          <Screen onBack={back} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  layer: { ...StyleSheet.absoluteFill },
  // A shadow on the leading edge separates the screen from the page below it while it slides.
  screen: { backgroundColor: colors.background, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: -2, height: 0 }, elevation: 8 },
});
