/**
 * A size at which a typeface has the images of its glyphs, such as the strikes of a color emoji
 * font. A strike is a copy of what Core listed when it was read from `Typeface.bitmapStrikes`.
 */
export interface BitmapStrike {
  /** The number of pixels in the em square, horizontally. */
  readonly pixelWidth: number;
  /** The number of pixels in the em square, vertically. */
  readonly pixelHeight: number;
}
