/** An axis along which a variable font changes. A copy of what Core listed when it was read. */
export interface VariationAxis {
  /** The OpenType tag of the axis as a number, such as `wght`. */
  readonly tag: number;
  /** The English name of the axis, or `undefined` if the font gives none. */
  readonly name: string | undefined;
  /** Tells whether the font asks to hide the axis from user interfaces. */
  readonly isHidden: boolean;
  /** The lowest value of the axis. */
  readonly minValue: number;
  /** The highest value of the axis. */
  readonly maxValue: number;
  /** The value of the axis when a typeface does not vary it. */
  readonly defaultValue: number;
}
