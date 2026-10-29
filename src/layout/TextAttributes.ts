import type { Color } from "../Color.js";
import type { Typeface } from "../graphics/Typeface.js";
import type { FontFeatures } from "../sfnt/FontFeatures.js";
import type { OpenTypeFeature } from "../sfnt/OpenTypeFeature.js";
import type { SfntTag } from "../sfnt/SfntTag.js";
import type { Replacement } from "./Replacement.js";
import type { TextAlignment } from "./enums.js";

/** The attributes that apply to a run of text. A member that is missing is not set. */
export interface RunAttributes {
  /** The typeface. Reading it gives a wrapper that the reader owns and disposes. */
  readonly typeface?: Typeface;
  /** The size of the em square, in the user space. */
  readonly typeSize?: number;
  /** The horizontal scale of the glyphs. */
  readonly scaleX?: number;
  /** The vertical scale of the glyphs. */
  readonly scaleY?: number;
  /** How far to raise the baseline, which is negative to lower it. */
  readonly baselineOffset?: number;
  /** The skew of the glyphs. Runs with different values are kept apart. */
  readonly obliqueness?: number;
  /**
   * What takes the place of the text of the range. Reading it gives a wrapper that the reader owns
   * and disposes. Core retains it, so the object that was given can be disposed.
   */
  readonly replacement?: Replacement;
  /** The color of the glyphs. */
  readonly foregroundColor?: Color;
  /** The color behind the glyphs. */
  readonly backgroundColor?: Color;
  /** Whether the range is underlined. */
  readonly underline?: boolean;
  /** Whether the range is struck through. */
  readonly strikethrough?: boolean;
  /** The color of the underline and the strikethrough. The foreground color is used when it is not set. */
  readonly decorationColor?: Color;
  /**
   * A whole number that the application chooses, which glyph runs give back. Core keeps it as a
   * pointer, so 0 is its `NULL`: it means no user data and cannot be told from an unset one. Use a
   * token above 0.
   */
  readonly userData?: number;
  /** The OpenType language tag; see `ShapingEngine.getLanguageTag()`. */
  readonly languageTag?: SfntTag;
  /**
   * The features to shape with. Writing takes a `FontFeatures` or a list of features, and reading
   * gives a `FontFeatures` that the reader owns and disposes.
   */
  readonly fontFeatures?: FontFeatures | readonly OpenTypeFeature[];
}

/** The attributes that apply to a whole paragraph. A member that is missing is not set. */
export interface ParagraphAttributes {
  /** The alignment of the lines of the paragraph. */
  readonly textAlignment?: TextAlignment;
  /** The indent of the first line from the leading edge. */
  readonly firstLineHeadIndent?: number;
  /** The indent of the lines other than the first from the leading edge. */
  readonly headIndent?: number;
  /** Positive: distance from the leading edge to the trailing margin. Zero or less: distance from the trailing edge. */
  readonly tailIndent?: number;
  /** The number of lines that the first line head indent applies to. */
  readonly firstIndentLineCount?: number;
  /** The space before the paragraph. */
  readonly paragraphSpacingBefore?: number;
  /** The space after the paragraph. */
  readonly paragraphSpacing?: number;
  /** A multiple of the natural height of each line. */
  readonly lineHeightMultiple?: number;
  /** The least height of a line. */
  readonly minimumLineHeight?: number;
  /** The greatest height of a line. Zero means no limit. */
  readonly maximumLineHeight?: number;
  /** The space added between lines. */
  readonly lineSpacing?: number;
}

/** All attributes of text. */
export type TextAttributes = RunAttributes & ParagraphAttributes;

/** The name of an attribute. */
export type TextAttributeName = keyof TextAttributes;

/** What attributes stay the same over a stretch of text. */
export interface TextAttributeRun {
  /** The attributes of the stretch. */
  readonly attributes: TextAttributes;
  /** The number of code units, from the index that was asked for, that the attributes cover. */
  readonly length: number;
}
