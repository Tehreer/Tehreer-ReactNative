import { checkRange } from "../collections/ListBounds.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { readAttributeList } from "./TextAttributeCodec.js";
import type { TextAttributeRun } from "./TextAttributes.js";
import type { TMutableText } from "./TMutableText.js";

/** `TRStringEncodingUTF16`: the text of this wrapper is always UTF-16, as a JavaScript string is. */
export const UTF16 = 1;

// Large enough to keep String.fromCharCode away from the engine's argument limit.
const CHUNK = 8192;

/** The code units of a string, which keep an unpaired surrogate as it is. */
export function toCodeUnits(text: string): Uint16Array {
  if (typeof text !== "string") {
    throw new TypeError("text must be a string.");
  }
  const units = new Uint16Array(text.length);
  for (let index = 0; index < units.length; index++) {
    units[index] = text.charCodeAt(index);
  }
  return units;
}

function fromCodeUnits(units: Uint16Array): string {
  let result = "";
  for (let start = 0; start < units.length; start += CHUNK) {
    result += String.fromCharCode(...units.subarray(start, start + CHUNK));
  }
  return result;
}

/**
 * Text with attributes on its ranges. The code units are UTF-16, so the indices are those of a
 * JavaScript string; a range may start or end between the halves of a surrogate pair, as Core
 * counts code units.
 *
 * A text is immutable and thread safe; `TMutableText` is the editable kind. Editing a copy never
 * changes its source.
 */
export class TText extends NativeObject<"TRText"> {
  /**
   * Makes a text of a string, which has no attributes.
   *
   * @throws TypeError if `text` is not a string.
   * @throws Error if Core cannot create the text.
   */
  constructor(text: string);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRText">);
  constructor(text: string | typeof adopt, handle?: Handle<"TRText">) {
    if (text === adopt) {
      super(handle as Handle<"TRText">);
      return;
    }

    const units = toCodeUnits(text);
    // Core accepts no buffer for no code units.
    const created = getNativeBindings().TRTextCreate(units.length === 0 ? undefined : units, units.length, UTF16);
    if (created === undefined) {
      throw new Error("Could not create a text.");
    }
    super(created);
  }

  /** The number of code units. */
  get length(): number {
    return getNativeBindings().TRTextGetLength(this.nativeHandle);
  }

  /** The code units as a string. */
  get string(): string {
    return this.getString(0, this.length);
  }

  /**
   * Copies the code units from `fromIndex` up to `toIndex` as a string.
   *
   * @throws {RangeError} If the range is not within the text.
   */
  getString(fromIndex: number, toIndex: number): string {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, b.TRTextGetLength(handle));

    const units = new Uint16Array(toIndex - fromIndex);
    if (units.length === 0) {
      return "";
    }
    if (!b.TRTextGetCodeUnits(handle, fromIndex, units.length, units)) {
      throw new Error("Could not copy the code units.");
    }
    return fromCodeUnits(units);
  }

  /**
   * Returns the attributes that are set at an index, and how long they stay the same. The typeface
   * and font features in them are wrappers that the caller owns and disposes.
   *
   * @returns The attributes, or `undefined` if the index is not less than the length.
   * @throws {RangeError} If the index is not a whole number that is not negative.
   */
  getAttributeRun(index: number): TextAttributeRun | undefined {
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new RangeError(`index (${index}) must be a whole number that is not negative.`);
    }

    const b = getNativeBindings();
    const { result, outLength } = b.TRTextCopyAttributes(this.nativeHandle, index);
    if (result === undefined) {
      return undefined;
    }

    try {
      return { attributes: readAttributeList(result), length: outLength };
    } finally {
      // The objects that were read hold references of their own.
      b.disposeHandle(result);
    }
  }

  /** Makes an immutable copy, which has the attributes too. */
  copy(): TText {
    const created = getNativeBindings().TRTextCreateCopy(this.nativeHandle);
    if (created === undefined) {
      throw new Error("Could not copy the text.");
    }
    return new TText(adopt, created);
  }

  /**
   * Makes a copy that can be edited, which has the attributes too.
   *
   * It needs `TMutableText.ts` to be loaded, which importing the package index does.
   */
  mutableCopy(): TMutableText {
    const created = getNativeBindings().TRTextCreateMutableCopy(this.nativeHandle);
    if (created === undefined) {
      throw new Error("Could not copy the text.");
    }
    return makeMutable(created);
  }

  override toString(): string {
    return this.string;
  }
}

// TMutableText extends TText, so it cannot be imported here; it registers how to wrap a handle.
let makeMutable: (handle: Handle<"TRText">) => TMutableText = () => {
  throw new Error("TMutableText is not loaded.");
};

/** @internal */
export function setMutableTextFactory(factory: (handle: Handle<"TRText">) => TMutableText): void {
  makeMutable = factory;
}
