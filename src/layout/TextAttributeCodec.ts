import { Typeface } from "../graphics/Typeface.js";
import { TextAlignment } from "./enums.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { NativeAttribute } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import type { NativeObject } from "../internal/NativeObject.js";
import { FontFeatures } from "../sfnt/FontFeatures.js";
import { Replacement } from "./Replacement.js";
import type { TextAttributeName, TextAttributes } from "./TextAttributes.js";

type Kind = "typeface" | "float" | "color" | "boolean" | "count" | "tag" | "alignment" | "token" | "fontFeatures" | "replacement";

/** The `TRAttributeType` and the kind of the value of every attribute, as TRAttribute.h lists them. */
const ATTRIBUTES: Record<TextAttributeName, readonly [type: number, kind: Kind]> = {
  typeface: [1, "typeface"],
  typeSize: [2, "float"],
  scaleX: [3, "float"],
  scaleY: [4, "float"],
  baselineOffset: [5, "float"],
  obliqueness: [6, "float"],
  replacement: [7, "replacement"],
  textAlignment: [8, "alignment"],
  firstLineHeadIndent: [9, "float"],
  headIndent: [10, "float"],
  tailIndent: [11, "float"],
  firstIndentLineCount: [12, "count"],
  paragraphSpacingBefore: [13, "float"],
  paragraphSpacing: [14, "float"],
  lineHeightMultiple: [15, "float"],
  minimumLineHeight: [16, "float"],
  maximumLineHeight: [17, "float"],
  lineSpacing: [18, "float"],
  foregroundColor: [19, "color"],
  userData: [20, "token"],
  languageTag: [21, "tag"],
  fontFeatures: [22, "fontFeatures"],
  backgroundColor: [23, "color"],
  underline: [24, "boolean"],
  strikethrough: [25, "boolean"],
  decorationColor: [26, "color"],
};

const NAMES_BY_TYPE = new Map<number, TextAttributeName>(
  (Object.keys(ATTRIBUTES) as TextAttributeName[]).map((name) => [ATTRIBUTES[name][0], name]),
);

/** An attribute that is ready to be given to Core, and what has to be disposed once Core has it. */
export interface PreparedAttribute {
  readonly name: TextAttributeName;
  readonly attribute: NativeAttribute;
  /** A temporary object that was made for the value; Core retains what it keeps, so it is not needed afterwards. */
  readonly temporary?: FontFeatures;
}

function entryOf(name: string): readonly [number, Kind] {
  // `Object.hasOwn`: a name like "constructor" or "toString" is not an attribute.
  if (!Object.hasOwn(ATTRIBUTES, name)) {
    throw new TypeError(`Unknown text attribute: ${name}`);
  }
  return ATTRIBUTES[name as TextAttributeName];
}

/** The `TRAttributeType` of an attribute. @throws TypeError if there is no such attribute. */
export function attributeType(name: string): number {
  return entryOf(name)[0];
}

// The largest finite `TRFloat` (FLT_MAX): the native side refuses a bigger double.
const MAX_FLOAT = 3.4028234663852886e38;

function checkUnsigned32(name: string, value: unknown): number {
  if (typeof value !== "number") {
    throw new TypeError(`${name} must be a number.`);
  }
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} (${value}) must be a whole number from 0 to 4294967295.`);
  }
  return value;
}

function prepareValue(name: TextAttributeName, kind: Kind, value: unknown): { value: NativeAttribute["value"]; temporary?: FontFeatures } {
  switch (kind) {
    case "typeface":
      if (!(value instanceof Typeface)) {
        throw new TypeError(`${name} must be a Typeface.`);
      }
      return { value: value.nativeHandle };
    case "replacement":
      if (!(value instanceof Replacement)) {
        throw new TypeError(`${name} must be a Replacement.`);
      }
      return { value: value.nativeHandle };
    case "fontFeatures":
      if (value instanceof FontFeatures) {
        return { value: value.nativeHandle };
      }
      if (!Array.isArray(value)) {
        throw new TypeError(`${name} must be a FontFeatures or an array of features.`);
      }
      // Core retains the set it is given, so a temporary made for this call can be disposed after it.
      {
        const temporary = new FontFeatures(value);
        return { value: temporary.nativeHandle, temporary };
      }
    case "float":
      if (typeof value !== "number") {
        throw new TypeError(`${name} must be a number.`);
      }
      if (!Number.isFinite(value) || Math.abs(value) > MAX_FLOAT) {
        throw new RangeError(`${name} (${value}) must be a finite number that a 32-bit float can hold.`);
      }
      return { value };
    case "boolean":
      if (typeof value !== "boolean") {
        throw new TypeError(`${name} must be a boolean.`);
      }
      return { value };
    case "count":
      // Not -1: that is Core's invalid index, which no count can be.
      if (typeof value !== "number") {
        throw new TypeError(`${name} must be a number.`);
      }
      // 32 bits: the native side refuses more on a 32-bit device, where a count and a token are 4 bytes.
      if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
        throw new RangeError(`${name} (${value}) must be a whole number from 0 to 4294967295.`);
      }
      return { value };
    case "token":
      if (typeof value !== "number") {
        throw new TypeError(`${name} must be a number.`);
      }
      // 32 bits: the native side refuses more on a 32-bit device, where a count and a token are 4 bytes.
      if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
        throw new RangeError(`${name} (${value}) must be a whole number from 0 to 4294967295.`);
      }
      return { value };
    case "alignment":
      if (value !== TextAlignment.Left && value !== TextAlignment.Center && value !== TextAlignment.Right
        && value !== TextAlignment.Leading && value !== TextAlignment.Trailing) {
        throw new RangeError(`${name} (${String(value)}) is not a TextAlignment.`);
      }
      return { value };
    case "color":
    case "tag":
      return { value: checkUnsigned32(name, value) };
  }
}

/** The names of the members that are set, which are those that are not `undefined`. */
export function attributeNames(attributes: TextAttributes): TextAttributeName[] {
  if (typeof attributes !== "object" || attributes === null) {
    throw new TypeError("attributes must be an object.");
  }
  return Object.keys(attributes).filter((name) => (attributes as Record<string, unknown>)[name] !== undefined) as TextAttributeName[];
}

/**
 * Prepares one attribute per member that is set. Every value is checked before anything is given to
 * Core, so a bad member changes nothing. The caller disposes the temporaries.
 *
 * @throws TypeError if a name is not an attribute or a value is of the wrong type.
 * @throws RangeError if a number is not valid for its attribute.
 */
export function prepareAttributes(attributes: TextAttributes): PreparedAttribute[] {
  const prepared: PreparedAttribute[] = [];
  try {
    for (const name of attributeNames(attributes)) {
      const [type, kind] = entryOf(name);
      const { value, temporary } = prepareValue(name, kind, (attributes as Record<string, unknown>)[name]);
      prepared.push({ name, attribute: { type, value }, temporary });
    }
  } catch (error) {
    disposeTemporaries(prepared);
    throw error;
  }
  return prepared;
}

export function disposeTemporaries(prepared: readonly PreparedAttribute[]): void {
  for (const { temporary } of prepared) {
    temporary?.dispose();
  }
}

/**
 * Reads every attribute of a list of Core. The objects that come out (typeface, font features) own
 * a reference of their own, which the reader disposes.
 */
export function readAttributeList(list: Handle<"TRAttributeList">): TextAttributes {
  const b = getNativeBindings();
  const attributes: Record<string, unknown> = {};
  const made: NativeObject<string>[] = [];

  try {
    const count = b.TRAttributeListGetCount(list);
    for (let index = 0; index < count; index++) {
      const view = b.TRAttributeListGetItem(list, index);
      if (view === undefined) {
        // Core gives an item for every index below the count, so this is a broken list, not a gap.
        throw new Error(`Core did not return attribute ${index} of ${count}.`);
      }

      // The conversion gives a reference of its own for a typeface or font features, owned from here.
      const { type, value } = b.readPointerStructs(view, 1, 0, 1)[0] as NativeAttribute;
      const name = NAMES_BY_TYPE.get(type);
      const kind = name === undefined ? undefined : ATTRIBUTES[name][1];

      if (name === undefined || kind === undefined) {
        // Core has an attribute that this wrapper has no member for: give its reference back.
        if (typeof value === "object") {
          b.disposeHandle(value);
        }
        continue;
      }

      switch (kind) {
        case "typeface": {
          const typeface = Typeface.adopting(value as Handle<"TRTypeface">);
          made.push(typeface);
          attributes[name] = typeface;
          break;
        }
        case "replacement": {
          const replacement = Replacement.adopting(value as Handle<"TRReplacement">);
          made.push(replacement);
          attributes[name] = replacement;
          break;
        }
        case "fontFeatures": {
          const features = FontFeatures.adopting(value as Handle<"TRFontFeatures">);
          made.push(features);
          attributes[name] = features;
          break;
        }
        default:
          attributes[name] = value;
      }
    }
  } catch (error) {
    for (const object of made) {
      object.dispose();
    }
    throw error;
  }

  return attributes as TextAttributes;
}
