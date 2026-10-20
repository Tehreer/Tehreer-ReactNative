import type { UInt32 } from "../collections/NumberKind.js";
import type { NumberList } from "../collections/List.js";

/** A palette of a color font. A copy of what Core listed when it was read. */
export interface ColorPalette {
  /** The English name of the palette, or `undefined` if the font gives none. */
  readonly name: string | undefined;
  /**
   * The flags of the `CPAL` table for the palette: 0x0001 means that it suits a light background
   * and 0x0002 a dark one. Zero if the font gives none.
   */
  readonly flags: number;
  /** The color of each palette entry of the typeface, in order, as `0xAARRGGBB`. */
  readonly colors: NumberList<UInt32>;
}
