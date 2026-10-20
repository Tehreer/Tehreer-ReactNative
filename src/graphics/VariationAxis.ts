/** An axis along which a variable font changes. A copy of what Core listed when it was read. */
export interface VariationAxis {
  /** The OpenType tag of the axis as a number, such as `wght`. */
  readonly tag: number;
  /** The English name of the axis, or `undefined` if the font gives none. */
  readonly name: string | undefined;
  /** Tells whether the font asks to hide the axis from user interfaces. */
  readonly isHidden: boolean;
  readonly minValue: number;
  readonly maxValue: number;
  readonly defaultValue: number;
}
