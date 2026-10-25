import { Color } from "../Color.js";
import type { DrawStyle, StrokeCap, StrokeJoin } from "../graphics/enums.js";
import type { Typeface } from "../graphics/Typeface.js";
import { BreakMode, TextAlignment, TruncationPlace } from "../layout/enums.js";
import type { Typesetter } from "../layout/Typesetter.js";
import type { TText } from "../layout/TText.js";

/** A color as `#rgb`, `#rrggbb` or `#aarrggbb` text (as `Color.parse()` reads it), or as an `0xAARRGGBB` number. */
export type ColorValue = string | number;

/** Where the text of a view comes from. A typesetter wins over an attributed text, which wins over a plain string. */
export interface TextSource {
  /**
   * A typesetter, which is preferred as it avoids making one; it stays owned by the caller, who keeps
   * it alive while it is shown. It must hold no replacement: the native side cannot call JavaScript,
   * so one in it would get a room of zero when the view lays the text out. The view refuses such a
   * typesetter with an `Error` (a text remembers that a replacement was set on it, so this costs
   * nothing); give a text with replacements as `attributedText`, and the view makes the replacements
   * itself. `typeface` and `textSize` are not used with it.
   */
  readonly typesetter?: Typesetter;
  /** Plain text, which is shown in `typeface` at `textSize`. */
  readonly text?: string;
  /**
   * Text with attributes. `typeface` and `textSize` are used where it sets none. A replacement in it
   * takes its room from its delegate when the view is laid out for the first time and again when the
   * width of the view changes a room, and is drawn from the rectangles that its `draw` fills (the
   * native side cannot call JavaScript, so nothing else is drawn). The view reads the text when this
   * property changes identity, so pass a new object (for example `text.copy()`) after editing a
   * `TMutableText`.
   */
  readonly attributedText?: TText;
}

/** How text is drawn, which the views keep in a renderer. */
export interface RenderingProps {
  /** The typeface of text that does not set one. */
  readonly typeface?: Typeface;
  /** The size of the em square, in layout units. The default is 16. */
  readonly textSize?: number;
  /** The default color of text. The default is black. */
  readonly textColor?: ColorValue;
  /** How the glyphs are drawn: filled, stroked, or both. Core's default is filled. */
  readonly drawStyle?: DrawStyle;
  readonly strokeColor?: ColorValue;
  /** Half of the width of the stroke, in layout units. */
  readonly strokeRadius?: number;
  readonly strokeCap?: StrokeCap;
  readonly strokeJoin?: StrokeJoin;
  readonly strokeMiter?: number;
  readonly shadowColor?: ColorValue;
  readonly shadowRadius?: number;
  readonly shadowDx?: number;
  readonly shadowDy?: number;
}

/** The settings of the frame resolver that both views have, as in Tehreer-Android and Tehreer-Cocoa. */
export interface ParagraphProps {
  /** The horizontal alignment of the text. The default is `TextAlignment.Leading`. */
  readonly textAlignment?: TextAlignment;
  /** Space added after each line, in layout units. It applies before `lineHeightMultiplier`. */
  readonly extraLineSpacing?: number;
  /** A multiple of the height of each line, after `extraLineSpacing`. The default is 1. */
  readonly lineHeightMultiplier?: number;
}

/** A range of code units to cover with a color, behind the text, such as a link or a selected verse. */
export interface TextHighlight {
  readonly fromIndex: number;
  readonly toIndex: number;
  /** The color of this highlight. The `highlightColor` of the view is used when there is none. */
  readonly color?: ColorValue;
}

export const DEFAULT_TEXT_SIZE = 16;
/** The color of a highlight that has none. A translucent blue. */
export const DEFAULT_HIGHLIGHT_COLOR = 0x6633b5e5;

export function toColor(value: ColorValue): Color {
  return typeof value === "number" ? value : Color.parse(value);
}

/** An `0xAARRGGBB` color as the signed 32-bit number that a native `Int32` prop carries. */
export function toNativeColor(value: ColorValue | undefined, fallback: number): number {
  return (value === undefined ? fallback : toColor(value)) | 0;
}

/** The settings of the frame resolver, as the views pass them to Core. */
export interface FrameSettings {
  readonly maxLines: number;
  readonly textAlignment: TextAlignment;
  readonly isTruncationEnabled: boolean;
  readonly truncationMode: BreakMode;
  readonly truncationPlace: TruncationPlace;
  readonly extraLineSpacing: number;
  readonly lineHeightMultiplier: number;
  readonly isJustificationEnabled: boolean;
  readonly justificationLevel: number;
}

/** Resolves the defaults of the props, which are Core's; `maxLines` is a whole number from 0 (no limit). */
export function resolveFrameSettings(props: Partial<{
  [Name in keyof FrameSettings]: FrameSettings[Name] | undefined;
}>): FrameSettings {
  return {
    maxLines: Math.max(0, Math.floor(props.maxLines ?? 0)),
    textAlignment: props.textAlignment ?? TextAlignment.Leading,
    isTruncationEnabled: props.isTruncationEnabled ?? false,
    truncationMode: props.truncationMode ?? BreakMode.Line,
    truncationPlace: props.truncationPlace ?? TruncationPlace.End,
    extraLineSpacing: props.extraLineSpacing ?? 0,
    lineHeightMultiplier: props.lineHeightMultiplier ?? 1,
    isJustificationEnabled: props.isJustificationEnabled ?? false,
    justificationLevel: props.justificationLevel ?? 1,
  };
}

/** A range of code units with the color that covers it, as `resolveHighlights` makes it. */
export interface ResolvedHighlight {
  readonly fromIndex: number;
  readonly toIndex: number;
  /** `0xAARRGGBB`. */
  readonly color: Color;
}

/**
 * Gives each highlight its color (its own, the view's, or the default) and checks the ranges.
 *
 * @throws RangeError if a range is not whole numbers from 0 with `fromIndex` not after `toIndex`. A
 *   range that reaches past the end of the text is not an error, because the text of a render can be
 *   the one before the text that the highlights were made for: it covers nothing.
 */
export function resolveHighlights(highlights: readonly TextHighlight[] | undefined, fallback: ColorValue | undefined): ResolvedHighlight[] {
  return (highlights ?? []).map((range) => {
    if (!Number.isInteger(range.fromIndex) || !Number.isInteger(range.toIndex) || range.fromIndex < 0 || range.toIndex < range.fromIndex) {
      throw new RangeError(`The highlight ${range.fromIndex}..${range.toIndex} is not a range of code units.`);
    }
    return { fromIndex: range.fromIndex, toIndex: range.toIndex, color: toColor(range.color ?? fallback ?? DEFAULT_HIGHLIGHT_COLOR) };
  });
}

/**
 * The renderer props of `TLinePaint`: what `RenderingProps` gives, under the names of the properties
 * of `Renderer` (the shadow ones as `glyphShadow…`, see the spec), with the colors as the signed 32-bit numbers that `Int32` props carry. A property that
 * is not given is `undefined`, which leaves the prop out and so keeps Core's default (the defaults of
 * the spec are Core's), as in Web's `createRenderer`.
 */
export interface NativeRenderer {
  readonly textColor: number;
  readonly drawStyle: number | undefined;
  readonly strokeColor: number | undefined;
  readonly strokeRadius: number | undefined;
  readonly strokeCap: number | undefined;
  readonly strokeJoin: number | undefined;
  readonly strokeMiter: number | undefined;
  readonly glyphShadowColor: number | undefined;
  readonly glyphShadowRadius: number | undefined;
  readonly glyphShadowDx: number | undefined;
  readonly glyphShadowDy: number | undefined;
}

export function toNativeRenderer(props: RenderingProps): NativeRenderer {
  const color = (value: ColorValue | undefined) => (value === undefined ? undefined : toColor(value) | 0);
  return {
    textColor: toNativeColor(props.textColor, 0xff000000),
    drawStyle: props.drawStyle,
    strokeColor: color(props.strokeColor),
    strokeRadius: props.strokeRadius,
    strokeCap: props.strokeCap,
    strokeJoin: props.strokeJoin,
    strokeMiter: props.strokeMiter,
    glyphShadowColor: color(props.shadowColor),
    glyphShadowRadius: props.shadowRadius,
    glyphShadowDx: props.shadowDx,
    glyphShadowDy: props.shadowDy,
  };
}
