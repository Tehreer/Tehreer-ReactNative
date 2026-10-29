import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { TypeSlope, TypeWeight, TypeWidth } from "./enums.js";
import { Typeface } from "./Typeface.js";

/**
 * A group of typefaces that the typeface manager has registered under one family.
 *
 * A family is a snapshot of a name and an ID, not an owner: it keeps no typeface alive, and a
 * lookup asks the manager at that moment, so it finds what is registered then. A family whose
 * typefaces were all unregistered finds nothing.
 */
export class TypeFamily {
  readonly #familyName: string;
  readonly #familyId: number;

  /** @internal */
  constructor(token: typeof adopt, familyName: string, familyId: number) {
    if (token !== adopt) {
      throw new Error("A TypeFamily comes from the TypefaceManager.");
    }
    this.#familyName = familyName;
    this.#familyId = familyId;
  }

  /**
   * The name of the family. For a family with an ID, it is the name of its first typeface in the
   * order of the manager. It is empty for typefaces that have no family name.
   */
  get familyName(): string {
    return this.#familyName;
  }

  /**
   * The ID that the typefaces were registered with, or 0 if they are grouped by their family name.
   *
   * @internal
   */
  get familyId(): number {
    return this.#familyId;
  }

  /**
   * Returns the typeface of the family that is closest to the style, as CSS Fonts Level 4 matches
   * them. Ties go to the typeface that was registered first.
   *
   * @returns A typeface that owns a reference of its own, or `undefined` if the family has none.
   * @throws RangeError if a number is not an integer in the range of its type.
   */
  getTypefaceByStyle(width: TypeWidth, weight: TypeWeight | number, slope: TypeSlope): Typeface | undefined {
    return matchTypeface(this.#familyId, this.#familyName, width, weight, slope);
  }

  /** Tells if both are the family of the same ID and name. */
  equals(other: TypeFamily): boolean {
    return this.#familyId === other.#familyId && this.#familyName === other.#familyName;
  }

  /** Describes the family for debugging. */
  toString(): string {
    return `TypeFamily(${this.#familyName})`;
  }
}

/**
 * Asks the manager for the closest typeface of a family: by ID when there is one, otherwise by the
 * family name among the typefaces that were registered without an ID.
 *
 * @internal
 */
export function matchTypeface(familyId: number, familyName: string, width: number, weight: number, slope: number): Typeface | undefined {
  const bindings = getNativeBindings();
  const matched =
    familyId !== 0
      ? bindings.TRTypefaceManagerGetMatchingTypefaceByFamilyID(familyId, width, weight, slope)
      : bindings.TRTypefaceManagerGetMatchingTypefaceByFamilyName(familyName, width, weight, slope);

  // The binding retained the typeface for its handle, which therefore owns a reference.
  return matched === undefined ? undefined : Typeface.adopting(matched);
}
