import type { Color } from "../Color.js";
import type { Typeface } from "../graphics/Typeface.js";
import type { FontFeatures } from "../sfnt/FontFeatures.js";
import type { OpenTypeFeature } from "../sfnt/OpenTypeFeature.js";
import type { SfntTag } from "../sfnt/SfntTag.js";
import type { TextAlignment } from "./enums.js";

// `replacement` (TRAttributeReplacement) is not a member yet: it needs the `Replacement` class and
// its delegate, which come with the layout package (issue #21). The native codec already handles it.

/** The attributes that apply to a run of text. A member that is missing is not set. */
export interface RunAttributes {
  /** The typeface. Reading it gives a wrapper that the reader owns and disposes. */
  readonly typeface?: Typeface;
  /** The size of the em square, in the user space. */
  readonly typeSize?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  /** How far to raise the baseline, which is negative to lower it. */
  readonly baselineOffset?: number;
  /** The skew of the glyphs. Runs with different values are kept apart. */
  readonly obliqueness?: number;
  readonly foregroundColor?: Color;
  readonly backgroundColor?: Color;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
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
  readonly textAlignment?: TextAlignment;
  readonly firstLineHeadIndent?: number;
  readonly headIndent?: number;
  /** Positive: distance from the leading edge to the trailing margin. Zero or less: distance from the trailing edge. */
  readonly tailIndent?: number;
  /** The number of lines that the first line head indent applies to. */
  readonly firstIndentLineCount?: number;
  readonly paragraphSpacingBefore?: number;
  readonly paragraphSpacing?: number;
  readonly lineHeightMultiple?: number;
  readonly minimumLineHeight?: number;
  readonly maximumLineHeight?: number;
  readonly lineSpacing?: number;
}

/** All attributes of text. */
export type TextAttributes = RunAttributes & ParagraphAttributes;

/** The name of an attribute. */
export type TextAttributeName = keyof TextAttributes;

/** What attributes stay the same over a stretch of text. */
export interface TextAttributeRun {
  readonly attributes: TextAttributes;
  /** The number of code units, from the index that was asked for, that the attributes cover. */
  readonly length: number;
}
