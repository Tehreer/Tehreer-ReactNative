import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { BackHandler } from 'react-native';
import { BidiScreen } from './BidiScreen';
import { CustomLabelScreen } from './CustomLabelScreen';
import { CustomTextViewScreen } from './CustomTextViewScreen';
import { GlyphsScreen } from './GlyphsScreen';
import { HomeScreen } from './HomeScreen';
import type { ScreenEntry } from './HomeScreen';
import { ShapingScreen } from './ShapingScreen';
import { TypefaceInfoScreen } from './TypefaceInfoScreen';
import { VariableFontsScreen } from './VariableFontsScreen';

const SCREENS: readonly (ScreenEntry & { readonly component: ComponentType<{ onBack: () => void }> })[] = [
  { id: 'bidi', title: 'Bidirectional Algorithm', summary: 'Resolve embedding levels and visual runs of mixed-direction text.', component: BidiScreen },
  { id: 'typeface-info', title: 'Typeface Information', summary: 'Read the names and metrics of a loaded typeface.', component: TypefaceInfoScreen },
  { id: 'glyphs', title: 'Typeface Glyphs', summary: 'Browse every glyph in a typeface by its glyph ID.', component: GlyphsScreen },
  { id: 'shaping', title: 'OpenType Shaping', summary: "Shape text with script and language tags, then inspect each glyph's ID, offset and advance.", component: ShapingScreen },
  { id: 'variable-fonts', title: 'Variable Fonts', summary: 'Adjust axes, pick instances and swap colour palettes.', component: VariableFontsScreen },
  { id: 'label', title: 'Custom Label', summary: 'A label that lays out styled, mixed-script text.', component: CustomLabelScreen },
  { id: 'text-view', title: 'Custom Text View', summary: 'A text view for long, colour-annotated Arabic text with adjustable size.', component: CustomTextViewScreen },
];

/**
 * The demo: the screens of the Tehreer-Web demo on `TLabel` and `TTextView`, using the public API of
 * the library only. Navigation is a piece of state, so the demo needs no navigation library.
 */
export function DemoApp({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState<string | undefined>();

  useEffect(() => {
    // The back button of Android goes up one level, and leaves the demo from its home.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (current === undefined) {
        onClose();
      } else {
        setCurrent(undefined);
      }
      return true;
    });
    return () => subscription.remove();
  }, [current, onClose]);

  const screen = SCREENS.find((candidate) => candidate.id === current);
  if (screen === undefined) {
    return <HomeScreen onClose={onClose} onOpen={setCurrent} screens={SCREENS} />;
  }

  const Screen = screen.component;
  return <Screen onBack={() => setCurrent(undefined)} />;
}
