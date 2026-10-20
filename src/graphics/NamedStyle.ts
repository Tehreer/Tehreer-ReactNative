import type { Float } from "../collections/NumberKind.js";
import type { NumberList } from "../collections/List.js";

/** A named instance of a variable font, such as "Bold". A copy of what Core listed when it was read. */
export interface NamedStyle {
  /** The English style name, or `undefined` if the font gives none. */
  readonly styleName: string | undefined;
  /** The variation coordinates, in the order of the variation axes of the typeface. */
  readonly coordinates: NumberList<Float>;
  /** The PostScript name of the style, or `undefined` if the font gives none. */
  readonly postScriptName: string | undefined;
}
