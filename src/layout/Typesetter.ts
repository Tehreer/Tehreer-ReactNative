import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { holding } from "../internal/Holding.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { checkConstant, checkNonEmptyRange } from "./Checks.js";
import { ComposedLine } from "./ComposedLine.js";
import { BreakMode, TruncationPlace } from "./enums.js";
import { disposeTemporaries, prepareAttributes } from "./TextAttributeCodec.js";
import type { TextAttributes } from "./TextAttributes.js";
import { TText, UTF16, toCodeUnits } from "./TText.js";

function holdsReplacement(text: TText | string, defaults: TextAttributes | undefined): boolean {
  if (defaults?.replacement !== undefined) {
    return true;
  }
  if (typeof text === "string") {
    return false;
  }
  for (let index = 0; index < text.length; ) {
    const run = text.getAttributeRun(index);
    if (run === undefined || run.length <= 0) {
      break;
    }
    const replacement = run.attributes.replacement;
    if (replacement !== undefined) {
      replacement.dispose();
      return true;
    }
    index += run.length;
  }
  return false;
}

function create(text: TText | string, defaultAttributes: TextAttributes | undefined): Handle<"TRTypesetter"> {
  if (typeof text !== "string" && !(text instanceof TText)) {
    throw new TypeError("text must be a string or a TText.");
  }

  // Everything is prepared before anything is made, so that a bad argument leaves nothing behind.
  const prepared = prepareAttributes(defaultAttributes ?? {});
  let own: TText | undefined;
  try {
    own = typeof text === "string" ? new TText(text) : undefined;
    const source = own ?? (text as TText);
    // What Core uses during the call is held, since a replacement's computeRoom runs inside it.
    const attributes = prepared.map(({ attribute }) => attribute);
    const handles = attributes.flatMap(({ value }) => (typeof value === "object" ? [value] : []));
    const created = holding([source.nativeHandle, ...handles], ([text, ...copies]) => {
      let next = 0;
      const held = attributes.map((attribute) => (typeof attribute.value === "object" ? { ...attribute, value: copies[next++] as Handle<string> } : attribute));
      return getNativeBindings().TRTypesetterCreate(text, held.length === 0 ? undefined : held);
    });
    if (created === undefined) {
      throw new Error("Could not create a typesetter. Does all of the text have a typeface?");
    }
    return created;
  } finally {
    // Core copies the text and retains what the attributes hold, so none of these is needed now.
    own?.dispose();
    disposeTemporaries(prepared);
  }
}

/**
 * Shapes text and breaks it into lines. It copies the text, so the text can be changed or disposed
 * after the typesetter is made. A typesetter is immutable and thread safe.
 *
 * The extents and widths that it takes are numbers that are not NaN (a NaN is a `RangeError`); an
 * infinite one is valid. The calls that can run a replacement's `computeRoom` hold references of
 * their own to the typesetter and what they use, so the handler may dispose them: the disposal takes
 * effect when the call returns. The range of a line is in code units, from
 * `fromIndex` up to but not including `toIndex`.
 */
export class Typesetter extends NativeObject<"TRTypesetter"> {
  private readonly _hasReplacements: boolean;

  /**
   * Makes a typesetter for a text.
   *
   * @param text The text to typeset. A string has no attributes, so the defaults have to give it a
   *   typeface.
   * @param defaultAttributes The attributes to use where the text sets none. Core looks only at
   *   those that decide how text is shaped: the typeface, type size, scales, baseline offset,
   *   obliqueness, replacement, language tag and font features. A typeface has to be given by the
   *   text or by them for every part, a replacement's included: Core refuses a replacement whose
   *   range has no typeface (ShapeResolver.c), although TRTypesetter.h says a typeface is not needed
   *   there. A `computeRoom` that a replacement has runs during this call, and an error it throws is
   *   thrown from here. The call holds references of its own to what it uses, so a `computeRoom`
   *   that disposes the text or an attribute's object only takes effect after it.
   * @throws TypeError if `text` is not a string or a `TText`, or an attribute is of the wrong type.
   * @throws RangeError if the value of an attribute is not valid.
   * @throws Error if some text, a replacement's included, has no typeface, or Core cannot create the
   *   typesetter.
   */
  constructor(text: TText | string, defaultAttributes?: TextAttributes);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRTypesetter">);
  constructor(text: TText | string | typeof adopt, defaultAttributes?: TextAttributes | Handle<"TRTypesetter">) {
    // Looked at before the call: a `computeRoom` that runs during it may dispose the text.
    const hasReplacements = text !== adopt && holdsReplacement(text, defaultAttributes as TextAttributes | undefined);
    super(text === adopt ? (defaultAttributes as Handle<"TRTypesetter">) : create(text, defaultAttributes as TextAttributes | undefined));
    this._hasReplacements = hasReplacements;
  }

  /**
   * Whether the text or the defaults had a replacement when it was made. A view refuses such a
   * typesetter: the replacements of a view have to be holders (see `ViewTypesetter`), and one cannot
   * be told from another through a typesetter.
   *
   * @internal
   */
  get hasReplacements(): boolean {
    return this._hasReplacements;
  }

  /** The number of code units of the text. */
  get codeUnitCount(): number {
    return getNativeBindings().TRTypesetterGetCodeUnitCount(this.nativeHandle);
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
    // Core has no index for a range that is not within the text.
    if (index === -1) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not within the text.`);
    }
    return index;
  }
}

// Core gives no line for a range that is not within the text, and for a failure.
function checkLine(handle: Handle<"TRComposedLine"> | undefined, what: string): Handle<"TRComposedLine"> {
  if (handle === undefined) {
    throw new RangeError(`Could not create ${what}. Is the range within the text?`);
  }
  return handle;
}
