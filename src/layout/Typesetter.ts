import { checkRange } from "../collections/ListBounds.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { NativeAttribute } from "../internal/NativeBindings.js";
import { holding } from "../internal/Holding.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { checkConstant, checkIndex, checkNonEmptyRange } from "./Checks.js";
import { fromCodeUnits, toCodeUnits, UTF16 } from "./CodeUnits.js";
import { ComposedLine } from "./ComposedLine.js";
import { BoundaryDirection, BoundaryType, BreakMode, TruncationPlace } from "./enums.js";
import type { MutableTypesetter } from "./MutableTypesetter.js";
import { disposeTemporaries, prepareAttributes, readAttributeList } from "./TextAttributeCodec.js";
import type { TextAttributeRun, TextAttributes } from "./TextAttributes.js";

/** A range of code units, from `startIndex` up to but not including `endIndex`. */
export interface CodeUnitRange {
  readonly startIndex: number;
  readonly endIndex: number;
}

/**
 * Prepares the default attributes for Core, runs `body` with them, and disposes what was made for
 * the values once Core has them. What Core uses during the call is held, since the `computeRoom` of
 * a replacement can run inside it and dispose a wrapper.
 *
 * @internal
 */
export function withDefaultAttributes<Result>(
  defaultAttributes: TextAttributes | undefined,
  body: (attributes: readonly NativeAttribute[] | undefined) => Result,
): Result {
  // Everything is prepared before anything is made, so that a bad argument leaves nothing behind.
  const prepared = prepareAttributes(defaultAttributes ?? {});
  try {
    const attributes = prepared.map(({ attribute }) => attribute);
    const handles = attributes.flatMap(({ value }) => (typeof value === "object" ? [value] : []));
    return holding(handles, (copies) => {
      let next = 0;
      const held = attributes.map((attribute) => (typeof attribute.value === "object" ? { ...attribute, value: copies[next++] as Handle<string> } : attribute));
      return body(held.length === 0 ? undefined : held);
    });
  } finally {
    // Core retains what the attributes hold, so none of the temporaries is needed now.
    disposeTemporaries(prepared);
  }
}

/**
 * Holds a text with attributes on its ranges, shapes it, and breaks it into lines. The code units
 * are UTF-16, so the indices are those of a JavaScript string; a range may start or end between the
 * halves of a surrogate pair, as Core counts code units. Each paragraph is shaped when it is made or
 * changed, so lines can be made over and over again for different ranges and extents.
 *
 * A typesetter is immutable and thread safe; {@link MutableTypesetter} is the editable kind. Editing
 * a copy never changes its source. A text without a typeface is fine until a line or a frame is
 * asked for: then the typeface must come from the attributes of the text or the defaults, for every
 * part that is not a replacement.
 *
 * The extents and widths that it takes are numbers that are not NaN (a NaN is a `RangeError`); an
 * infinite one is valid. The calls that can run a replacement's `computeRoom` hold references of
 * their own to the typesetter and what they use, so the handler may dispose them: the disposal takes
 * effect when the call returns. The range of a line is in code units, from
 * `fromIndex` up to but not including `toIndex`.
 */
export class Typesetter extends NativeObject<"TRTypesetter"> {
  /**
   * Whether a replacement was ever set on this typesetter or on the one it was copied from. It is
   * never false for a typesetter that has one, so {@link hasReplacements} can answer without walking
   * the runs.
   *
   * @internal
   */
  mayHaveReplacement?: boolean;

  /**
   * Whether the default attributes had a replacement. Core cannot change the defaults of a
   * typesetter, so a view cannot swap this one for a holder, and refuses it.
   *
   * @internal
   */
  hasDefaultReplacement?: boolean;

  /**
   * Makes a typesetter of a string, which has no attributes.
   *
   * @param text The string of the text.
   * @param defaultAttributes The attributes to use where the text sets none. Core looks only at
   *   those that decide how text is shaped: the typeface, type size, scales, baseline offset,
   *   obliqueness, replacement, language tag and font features. A typeface has to be given by them,
   *   or by the attributes of the text, for every part that is not a replacement, or no line can be
   *   made over that part. A `computeRoom` that a replacement has runs during this call, and an
   *   error it throws is thrown from here. The call holds references of its own to what it uses, so
   *   a `computeRoom` that disposes an attribute's object only takes effect after it.
   * @throws TypeError if `text` is not a string, or an attribute is of the wrong type.
   * @throws RangeError if the value of an attribute is not valid.
   * @throws Error if Core cannot create the typesetter.
   */
  constructor(text: string, defaultAttributes?: TextAttributes);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRTypesetter">);
  constructor(text: string | typeof adopt, defaultAttributes?: TextAttributes | Handle<"TRTypesetter">) {
    if (text === adopt) {
      super(defaultAttributes as Handle<"TRTypesetter">);
      return;
    }

    const attributes = defaultAttributes as TextAttributes | undefined;
    const units = toCodeUnits(text);
    // Core accepts no buffer for no code units.
    const created = withDefaultAttributes(attributes, (held) =>
      getNativeBindings().TRTypesetterCreate(units.length === 0 ? undefined : units, units.length, UTF16, held));
    if (created === undefined) {
      throw new Error("Could not create a typesetter.");
    }
    super(created);
    this.mayHaveReplacement = attributes?.replacement !== undefined;
    this.hasDefaultReplacement = this.mayHaveReplacement;
  }

  /**
   * Whether the typesetter or its defaults had a replacement when it was made or edited. A view
   * refuses such a typesetter: the replacements of a view have to be made by the view (see
   * `ViewTypesetter`).
   *
   * @internal
   */
  get hasReplacements(): boolean {
    return this.mayHaveReplacement === true;
  }

  /** The number of code units of the text. */
  get length(): number {
    return getNativeBindings().TRTypesetterGetLength(this.nativeHandle);
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
    checkRange(fromIndex, toIndex, b.TRTypesetterGetLength(handle));

    const units = new Uint16Array(toIndex - fromIndex);
    if (units.length === 0) {
      return "";
    }
    if (!b.TRTypesetterGetCodeUnits(handle, fromIndex, units.length, units)) {
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
    checkIndex("index", index);

    const b = getNativeBindings();
    const { result, outLength } = b.TRTypesetterCopyAttributes(this.nativeHandle, index);
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

  /**
   * Makes an immutable copy, which has the attributes too. It shares the shaping of the paragraphs,
   * so it costs little.
   *
   * @throws Error if the typesetter is in an editing batch.
   */
  copy(): Typesetter {
    const created = getNativeBindings().TRTypesetterCreateCopy(this.nativeHandle);
    if (created === undefined) {
      throw new Error("Could not copy the typesetter. Is it in an editing batch?");
    }
    const copy = new Typesetter(adopt, created);
    copy.mayHaveReplacement = this.mayHaveReplacement;
    copy.hasDefaultReplacement = this.hasDefaultReplacement;
    return copy;
  }

  /**
   * Makes a copy that can be edited, which has the attributes too.
   *
   * It needs `MutableTypesetter.ts` to be loaded, which importing the package index does.
   *
   * @throws Error if the typesetter is in an editing batch.
   */
  mutableCopy(): MutableTypesetter {
    const created = getNativeBindings().TRTypesetterCreateMutableCopy(this.nativeHandle);
    if (created === undefined) {
      throw new Error("Could not copy the typesetter. Is it in an editing batch?");
    }
    const copy = makeMutable(created);
    copy.mayHaveReplacement = this.mayHaveReplacement;
    copy.hasDefaultReplacement = this.hasDefaultReplacement;
    return copy;
  }

  /**
   * Finds the boundary of a type that is next to an index, by Unicode Standard Annex #29 for
   * graphemes and words, and by the separators of the text for paragraphs. The start and the end of
   * the text are boundaries of every type. It needs no typeface.
   *
   * @param index The index to search from, which can be the length of the text.
   * @returns The index of the boundary, or `undefined` if the index is past the end of the text,
   *   there is none in that direction, or the typesetter is in an editing batch.
   * @throws RangeError if the index is not a whole number that is not negative, or the type or the
   *   direction is not one of its constants.
   */
  findBoundary(index: number, type: BoundaryType, direction: BoundaryDirection): number | undefined {
    checkIndex("index", index);
    checkConstant("type", type, BoundaryType);
    checkConstant("direction", direction, BoundaryDirection);

    const boundary = getNativeBindings().TRTypesetterFindBoundary(this.nativeHandle, index, type, direction);
    return boundary === -1 ? undefined : boundary;
  }

  /**
   * Gets the range of the segment of a boundary type that contains an index, such as the word under
   * a caret.
   *
   * @param index The index that the segment contains, which can be the length of the text and has an
   *   empty segment.
   * @returns The range, or `undefined` if the index is past the end of the text, or the typesetter
   *   is in an editing batch.
   * @throws RangeError if the index is not a whole number that is not negative, or the type is not
   *   one of its constants.
   */
  getBoundaryRange(index: number, type: BoundaryType): CodeUnitRange | undefined {
    checkIndex("index", index);
    checkConstant("type", type, BoundaryType);

    const range = getNativeBindings().TRTypesetterGetBoundaryRange(this.nativeHandle, index, type);
    if (range.index === -1) {
      return undefined;
    }
    return { startIndex: range.index, endIndex: range.index + range.length };
  }

  override toString(): string {
    return this.string;
  }

  /**
   * Suggests where to break the code units from `fromIndex` up to `toIndex` so that the line fits in
   * an extent, measuring forward from the start. A line break does not cross a paragraph.
   *
   * @returns The index after the last code unit that fits, which is `toIndex` if all of them do and
   *   at least one character after `fromIndex` otherwise.
   * @throws RangeError if the range is empty or is not within the text.
   */
  suggestForwardBreak(fromIndex: number, toIndex: number, extent: number, breakMode: BreakMode): number {
    return this.#suggest("forward", fromIndex, toIndex, extent, breakMode);
  }

  /**
   * Suggests where to break so that the line fits in an extent, measuring backward from `toIndex`.
   *
   * @returns The index of the first code unit of the line that fits, which is `fromIndex` if all of
   *   them do.
   * @throws RangeError if the range is empty or is not within the text.
   */
  suggestBackwardBreak(fromIndex: number, toIndex: number, extent: number, breakMode: BreakMode): number {
    return this.#suggest("backward", fromIndex, toIndex, extent, breakMode);
  }

  /**
   * Makes a line of the code units from `fromIndex` up to `toIndex`, which has no limit to its
   * extent. Its origin is at zero.
   *
   * @param layoutWidth The width of the frame that the line is made for, or 0 if there is none: the
   *   `computeRoom` of a replacement gets it.
   * @throws RangeError if the range is empty or is not within the text.
   */
  createSimpleLine(fromIndex: number, toIndex: number, layoutWidth = 0): ComposedLine {
    checkNonEmptyRange(fromIndex, toIndex);
    const line = holding([this.nativeHandle], ([handle]) =>
      getNativeBindings().TRTypesetterCreateSimpleLine(handle, fromIndex, toIndex - fromIndex, layoutWidth));
    return ComposedLine.adopting(checkLine(line, "a line"));
  }

  /**
   * Makes the line of the token that shows in place of the text that a truncated line cuts out. It
   * is shaped like the text at the place of the truncation.
   *
   * @param fromIndex The first code unit of the range that is truncated.
   * @param token The token. Without one, or with an empty string, it is an ellipsis (three dots if
   *   the typeface has none).
   * @throws RangeError if the range is empty or is not within the text, or the place is not a
   *   `TruncationPlace`.
   * @throws TypeError if the token is not a string.
   */
  createTruncationToken(fromIndex: number, toIndex: number, place: TruncationPlace, token?: string): ComposedLine {
    checkNonEmptyRange(fromIndex, toIndex);
    checkConstant("place", place, TruncationPlace);
    const units = token === undefined ? undefined : toCodeUnits(token);
    const line = holding([this.nativeHandle], ([handle]) => getNativeBindings().TRTypesetterCreateTruncationToken(
      handle, fromIndex, toIndex - fromIndex, place,
      units === undefined || units.length === 0 ? undefined : units, units?.length ?? 0, UTF16,
    ));
    return ComposedLine.adopting(checkLine(line, "a truncation token"));
  }

  /**
   * Makes a line of a range, cutting out the part that does not fit in the extent and showing a
   * token instead. A line that fits is made as `createSimpleLine()` makes it. The range of the line
   * is the whole range, including the text that was cut out.
   *
   * @param tokenLine The line of the token, such as one from `createTruncationToken()`.
   * @throws RangeError if the range is empty or is not within the text, or the place is not a
   *   `TruncationPlace`.
   * @throws TypeError if `tokenLine` is not a `ComposedLine`.
   */
  createTruncatedLine(
    fromIndex: number, toIndex: number, extent: number, breakMode: BreakMode, place: TruncationPlace, tokenLine: ComposedLine,
  ): ComposedLine {
    checkNonEmptyRange(fromIndex, toIndex);
    checkConstant("breakMode", breakMode, BreakMode);
    checkConstant("place", place, TruncationPlace);
    if (!(tokenLine instanceof ComposedLine)) {
      throw new TypeError("tokenLine must be a ComposedLine.");
    }
    const line = holding([this.nativeHandle, tokenLine.nativeHandle], ([handle, token]) =>
      getNativeBindings().TRTypesetterCreateTruncatedLine(handle, fromIndex, toIndex - fromIndex, extent, breakMode, place, token));
    return ComposedLine.adopting(checkLine(line, "a truncated line"));
  }

  /**
   * Makes a line of a range, stretched to an extent by adding space to its inner spaces.
   *
   * @param justificationFactor How much of the extra space is used: 1 stretches the line fully and 0
   *   leaves it as it is. Core does not clamp it, so what a factor outside 0 to 1 does is Core's:
   *   the wrapper passes it as it is.
   * @param justificationExtent The extent to stretch the line to. The spaces are squeezed if it is
   *   less than the width of the line.
   * @throws RangeError if the range is empty or is not within the text.
   */
  createJustifiedLine(fromIndex: number, toIndex: number, justificationFactor: number, justificationExtent: number): ComposedLine {
    checkNonEmptyRange(fromIndex, toIndex);
    const line = holding([this.nativeHandle], ([handle]) => getNativeBindings().TRTypesetterCreateJustifiedLine(
      handle, fromIndex, toIndex - fromIndex, justificationFactor, justificationExtent,
    ));
    return ComposedLine.adopting(checkLine(line, "a justified line"));
  }

  #suggest(direction: "forward" | "backward", fromIndex: number, toIndex: number, extent: number, breakMode: BreakMode): number {
    checkNonEmptyRange(fromIndex, toIndex);
    checkConstant("breakMode", breakMode, BreakMode);
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    const index = direction === "forward"
      ? b.TRTypesetterSuggestForwardBreak(handle, fromIndex, toIndex - fromIndex, extent, breakMode)
      : b.TRTypesetterSuggestBackwardBreak(handle, fromIndex, toIndex - fromIndex, extent, breakMode);
    // Core has no index for a range that is not within the text or touches text without a typeface.
    if (index === -1) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not within the text, or some of it has no typeface.`);
    }
    return index;
  }
}

// Core gives no line for a range that is not within the text, text without a typeface, a typesetter
// that is in an editing batch, and for a failure.
function checkLine(handle: Handle<"TRComposedLine"> | undefined, what: string): Handle<"TRComposedLine"> {
  if (handle === undefined) {
    throw new RangeError(`Could not create ${what}. Is the range within the text, does all of it have a typeface, and is the typesetter outside an editing batch?`);
  }
  return handle;
}


// MutableTypesetter extends Typesetter, so it cannot be imported here; it registers how to wrap a handle.
let makeMutable: (handle: Handle<"TRTypesetter">) => MutableTypesetter = () => {
  throw new Error("MutableTypesetter is not loaded.");
};

/** @internal */
export function setMutableTypesetterFactory(factory: (handle: Handle<"TRTypesetter">) => MutableTypesetter): void {
  makeMutable = factory;
}
