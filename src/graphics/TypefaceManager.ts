import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { TypeSlope, TypeWeight, TypeWidth } from "./enums.js";
import { matchTypeface, TypeFamily } from "./TypeFamily.js";
import { Typeface } from "./Typeface.js";

// The tags and IDs of Core are unsigned and 0 means none. The binding would take -1 as the invalid
// index and register it as a huge tag, so it is refused here.
function checkId(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} (${value}) must be a whole number that is not negative.`);
  }
}

// Core compares family names ignoring the case of ASCII letters only, so a lookup that enumerates
// must do the same instead of using the case rules of the language.
function foldAscii(text: string): string {
  return text.replace(/[A-Z]/g, (letter) => String.fromCharCode(letter.charCodeAt(0) + 32));
}

/**
 * The registry of typefaces that the whole process shares. It identifies typefaces by an integer
 * tag, groups them into families, and picks the typeface of a family that is closest to a style.
 *
 * A tag of 0 and a family ID of 0 mean none, so valid values start at 1. The manager keeps its own
 * reference to what is registered until it is unregistered, so a registered typeface stays alive
 * when its wrapper is disposed. Every typeface this object returns is a new wrapper with a
 * reference of its own, which the caller disposes when done. Tests must unregister what they
 * register.
 */
export const TypefaceManager = {
  /**
   * Registers a typeface. The manager retains it until it is unregistered.
   *
   * @param tag The tag that identifies the typeface, or 0 for no tag.
   * @param familyId The ID of the family, or 0 to group it with the typefaces that have no family
   *   ID and the same family name.
   * @returns `false` if the typeface is already registered or the tag is already taken.
   * @throws RangeError if the tag or the family ID is not a whole number that is not negative.
   * @throws Error if the typeface is disposed.
   */
  registerTypeface(typeface: Typeface, tag = 0, familyId = 0): boolean {
    checkId("tag", tag);
    checkId("familyId", familyId);
    return getNativeBindings().TRTypefaceManagerRegisterTypeface(typeface.nativeHandle, tag, familyId);
  },

  /**
   * Unregisters a typeface, which frees its tag and family ID and releases the reference of the
   * manager.
   *
   * @returns `false` if the typeface is not registered.
   */
  unregisterTypeface(typeface: Typeface): boolean {
    return getNativeBindings().TRTypefaceManagerUnregisterTypeface(typeface.nativeHandle);
  },

  /**
   * Returns the typeface that is registered with a tag.
   *
   * @returns `undefined` if the tag is 0 or not taken.
   * @throws RangeError if the tag is not a whole number that is not negative.
   */
  getTypeface(tag: number): Typeface | undefined {
    checkId("tag", tag);
    const found = getNativeBindings().TRTypefaceManagerGetTypeface(tag);
    // The binding retained it, so the handle owns a reference.
    return found === undefined ? undefined : Typeface.adopting(found);
  },

  /** Returns the tag of a registered typeface, or 0 if it has none or is not registered. */
  getTypefaceTag(typeface: Typeface): number {
    return getNativeBindings().TRTypefaceManagerGetTypefaceTag(typeface.nativeHandle);
  },

  /** Returns the family ID of a registered typeface, or 0 if it has none or is not registered. */
  getTypefaceFamilyId(typeface: Typeface): number {
    return getNativeBindings().TRTypefaceManagerGetTypefaceFamilyID(typeface.nativeHandle);
  },

  /**
   * Returns the typeface that is closest to a style among those that were registered without a
   * family ID. The family name is compared ignoring the case of ASCII letters, and a typeface
   * without a family name is found by an empty name.
   *
   * @returns `undefined` if no registered typeface has the name.
   * @throws RangeError if a number is not an integer in the range of its type.
   */
  getTypefaceByStyle(familyName: string, width: TypeWidth, weight: TypeWeight | number, slope: TypeSlope): Typeface | undefined {
    return matchTypeface(0, familyName, width, weight, slope);
  },

  /** Returns the family with a name (ASCII case ignored), or `undefined` if there is none. */
  getTypeFamily(familyName: string): TypeFamily | undefined {
    const wanted = foldAscii(familyName);
    return TypefaceManager.getAvailableFamilies().find((family) => foldAscii(family.familyName) === wanted);
  },

  /** Returns the registered typeface that has a full name, or `undefined` if there is none. */
  getTypefaceByName(fullName: string): Typeface | undefined {
    let found: Typeface | undefined;
    for (const typeface of TypefaceManager.getAvailableTypefaces()) {
      if (found === undefined && typeface.fullName === fullName) {
        found = typeface;
      } else {
        typeface.dispose();
      }
    }
    return found;
  },

  /**
   * Returns the registered typefaces, ordered by family name and then by style name, ignoring the
   * case of ASCII letters. It is a snapshot: typefaces registered later are not in it.
   */
  getAvailableTypefaces(): Typeface[] {
    // Each handle owns a reference that the binding retained for it.
    return getNativeBindings()
      .TRTypefaceManagerEnumerateTypefaces()
      .map((handle) => Typeface.adopting(handle));
  },

  /** Returns the families of the registered typefaces, ordered by family name. */
  getAvailableFamilies(): TypeFamily[] {
    return getNativeBindings()
      .TRTypefaceManagerEnumerateFamilies()
      .map((family) => new TypeFamily(adopt, family.familyName, family.familyID));
  },
} as const;
