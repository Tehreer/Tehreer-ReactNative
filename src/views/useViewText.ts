import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Color } from "../Color.js";
import type { Typeface } from "../graphics/Typeface.js";
import type { BreakMode, TextAlignment, TruncationPlace } from "../layout/enums.js";
import type { TText } from "../layout/TText.js";
import { ViewText } from "./ViewText.js";

/** A color as `#rgb`, `#rrggbb` or `#aarrggbb` text (as `Color.parse()` reads it), or as an `0xAARRGGBB` number. */
export type ColorValue = string | number;

/** The default size of the em square, in layout units, as in Tehreer-Web. */
export const DEFAULT_TEXT_SIZE = 16;

/** Where the text of a view comes from, and how it is drawn: the properties that Tehreer-Android, Tehreer-Cocoa and Tehreer-Web share. */
export interface TextViewSource {
  /** Plain text, which is shown in `typeface` at `textSize`. */
  readonly text?: string;
  /**
   * Text with attributes. `typeface` and `textSize` are used where it sets none. Its replacements
   * are laid out and drawn by the view (see {@link ReplacementDelegate}); the view reads the text
   * when this property changes identity, so pass a new object (for example `text.copy()`) after
   * editing a `TMutableText`.
   */
  readonly attributedText?: TText;
  /** The typeface of text that does not set one. */
  readonly typeface?: Typeface;
  /** The size of the em square, in layout units. The default is 16. */
  readonly textSize?: number;
  /** The default color of text. The default is black. */
  readonly textColor?: ColorValue;
}

/** The settings of the frame resolver that both views share; the defaults are Core's. */
export interface TextViewLayout {
  /** The horizontal alignment of the text. The default is `TextAlignment.Leading`. */
  readonly textAlignment?: TextAlignment;
  /** Space added after each line, in layout units. It applies before `lineHeightMultiplier`. */
  readonly extraLineSpacing?: number;
  /** A multiple of the height of each line, after `extraLineSpacing`. The default is 1. */
  readonly lineHeightMultiplier?: number;
}

export function toColor(value: ColorValue): Color {
  return typeof value === "number" ? value : Color.parse(value);
}

/** An `0xAARRGGBB` color as the signed 32-bit number that the native `Int32` prop carries. */
export function toNativeColor(value: ColorValue | undefined, fallback: number): number {
  return value === undefined ? fallback : toColor(value) | 0;
}

export type { BreakMode, TruncationPlace };

/**
 * Makes the text of a view and keeps it registered for as long as it is shown. The text is made in
 * a layout effect, so it is on the first commit that the user sees; an older one is released a
 * moment after it was replaced, because the shadow node of the previous revision may still be
 * measuring it on another thread.
 *
 * @internal
 */
export function useViewText(source: TextViewSource): { viewText: ViewText | undefined; onLayout: (event: LayoutChangeEvent) => void } {
  const { text, attributedText, typeface, textSize = DEFAULT_TEXT_SIZE } = source;
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [viewText, setViewText] = useState<ViewText | undefined>();
  const current = useRef<ViewText | undefined>(undefined);

  useLayoutEffect(() => {
    const created = ViewText.create({ text, attributedText, typeface, textSize }, layoutWidth);
    current.current = created;
    setViewText(created);
    return () => {
      if (current.current === created) {
        current.current = undefined;
      }
      setTimeout(() => created.dispose(), 250);
    };
  }, [text, attributedText, typeface, textSize, layoutWidth]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      const made = current.current;
      // The delegates are asked again only when the width really changes a room.
      if (made !== undefined && made.hasReplacements && width !== layoutWidth && made.roomsDifferAt(width)) {
        setLayoutWidth(width);
      }
    },
    [layoutWidth],
  );

  return { viewText, onLayout };
}
