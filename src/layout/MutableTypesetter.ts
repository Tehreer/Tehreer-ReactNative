import { checkRange } from "../collections/ListBounds.js";
import { adopt } from "../internal/Adopt.js";
import { holding } from "../internal/Holding.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { toCodeUnits, UTF16 } from "./CodeUnits.js";
import { attributeType, disposeTemporaries, prepareAttributes } from "./TextAttributeCodec.js";
import type { TextAttributeName, TextAttributes } from "./TextAttributes.js";
import { setMutableTypesetterFactory, Typesetter, withDefaultAttributes } from "./Typesetter.js";

function create(defaultAttributes: TextAttributes | undefined): Handle<"TRTypesetter"> {
  const created = withDefaultAttributes(defaultAttributes, (held) => getNativeBindings().TRTypesetterCreateMutable(UTF16, held));
  if (created === undefined) {
    throw new Error("Could not create a mutable typesetter.");
  }
  return created;
}

/**
 * A typesetter whose text and attributes can be edited. A range that an edit puts in takes the
 * attributes of what it replaces. Its paragraphs are shaped as they are edited, or once when a
 * batch of edits ends. An edit whose shaping fails because a replacement's `computeRoom` threw
 * stays applied, and the error is rethrown.
 *
 * A mutable typesetter is not thread safe: do not change it while something lays it out. Take a copy
 * with `copy()` to lay it out while the text is edited. No line can be made, no break suggested, no
 * boundary searched and no copy taken while it is in an editing batch.
 */
export class MutableTypesetter extends Typesetter {
  /**
   * Makes a mutable typesetter of an empty text.
   *
   * @param defaultAttributes The attributes to use where the text sets none, as for
   *   {@link Typesetter}.
   * @throws TypeError if an attribute is of the wrong type.
   * @throws RangeError if the value of an attribute is not valid.
   * @throws Error if Core cannot create the typesetter.
   */
  constructor(defaultAttributes?: TextAttributes);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRTypesetter">);
  constructor(defaultAttributes?: TextAttributes | typeof adopt, handle?: Handle<"TRTypesetter">) {
    if (defaultAttributes === adopt) {
      super(adopt, handle as Handle<"TRTypesetter">);
      return;
    }

    super(adopt, create(defaultAttributes));
    this.mayHaveReplacement = defaultAttributes?.replacement !== undefined;
    this.hasDefaultReplacement = this.mayHaveReplacement;
  }

  /**
   * Starts a batch of edits, whose analysis and shaping are deferred until `endEditing()`. The
   * attributes can be set and removed in a batch, so a text with many attributes is built in one,
   * not by one change after another, each of which shapes its paragraph again. Batches do not nest:
   * a second `beginEditing()` has no effect.
   */
  beginEditing(): void {
    getNativeBindings().TRTypesetterBeginEditing(this.nativeHandle);
  }

  /** Ends a batch of edits, and analyzes and shapes the paragraphs that changed. */
  endEditing(): void {
    this.#shaping((handle) => getNativeBindings().TRTypesetterEndEditing(handle));
  }

  /**
   * Runs the edits that a function makes as one batch, which ends even if the function throws. The
   * error of the function wins over one from shaping.
   */
  edit(body: (typesetter: this) => void): void {
    this.beginEditing();
    let failure: unknown;
    let failed = false;
    try {
      body(this);
    } catch (error) {
      failed = true;
      failure = error;
    }
    try {
      this.endEditing();
    } catch (error) {
      // The error of the body is the first cause.
      if (!failed) {
        throw error;
      }
    }
    if (failed) {
      throw failure;
    }
  }

  /**
   * Adds a string to the end.
   *
   * @throws TypeError if `text` is not a string.
   */
  append(text: string): void {
    const units = toCodeUnits(text);
    if (units.length === 0) {
      return;
    }
    if (!this.#shaping((held) => getNativeBindings().TRTypesetterAppendCodeUnits(held, units, units.length))) {
      throw new Error("Could not append the string.");
    }
  }

  /**
   * Inserts a string at an index, which can be the length to insert at the end.
   *
   * @throws {RangeError} If the index is not within 0 up to the length.
   * @throws TypeError if `text` is not a string.
   */
  insert(index: number, text: string): void {
    const units = toCodeUnits(text);
    const handle = this.nativeHandle;
    checkRange(index, index, getNativeBindings().TRTypesetterGetLength(handle));
    if (units.length === 0) {
      return;
    }
    if (!this.#shaping((held) => getNativeBindings().TRTypesetterInsertCodeUnits(held, index, units, units.length))) {
      throw new Error("Could not insert the string.");
    }
  }

  /**
   * Removes the code units from `fromIndex` up to `toIndex`.
   *
   * @throws {RangeError} If the range is not within the text.
   */
  delete(fromIndex: number, toIndex: number): void {
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, getNativeBindings().TRTypesetterGetLength(handle));
    if (fromIndex === toIndex) {
      return;
    }
    if (!this.#shaping((held) => getNativeBindings().TRTypesetterDeleteCodeUnits(held, fromIndex, toIndex - fromIndex))) {
      throw new Error("Could not delete the code units.");
    }
  }

  /**
   * Replaces the code units from `fromIndex` up to `toIndex` with a string, which takes the
   * attributes of the range that it replaces.
   *
   * @throws {RangeError} If the range is not within the text.
   * @throws TypeError if `text` is not a string.
   */
  replace(fromIndex: number, toIndex: number, text: string): void {
    const units = toCodeUnits(text);
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, getNativeBindings().TRTypesetterGetLength(handle));
    // Core accepts no buffer for no code units, which only deletes the range.
    const buffer = units.length === 0 ? undefined : units;
    if (!this.#shaping((held) => getNativeBindings().TRTypesetterReplaceCodeUnits(held, fromIndex, toIndex - fromIndex, buffer, units.length))) {
      throw new Error("Could not replace the code units.");
    }
  }

  /**
   * Replaces the whole content. The new content takes the attributes of the content it replaces.
   *
   * @throws TypeError if `text` is not a string.
   */
  setString(text: string): void {
    const units = toCodeUnits(text);
    const buffer = units.length === 0 ? undefined : units;
    if (!this.#shaping((held) => getNativeBindings().TRTypesetterSetCodeUnits(held, buffer, units.length))) {
      throw new Error("Could not set the string.");
    }
  }

  /**
   * Sets attributes on the code units from `fromIndex` up to `toIndex`. An attribute that is
   * already set in a part of the range is replaced there. The typesetter retains what the
   * attributes refer to, such as a typeface, so they can be disposed after the call. Invalid
   * arguments are refused before the first attribute is set; a failure inside Core can still leave
   * the earlier members set. In a batch the paragraphs are shaped when it ends, otherwise now.
   *
   * @throws {RangeError} If the range is not within the text, or a number is not valid.
   * @throws TypeError if a name is not an attribute or a value is of the wrong type.
   * @throws Error if Core refuses an attribute.
   */
  setAttributes(fromIndex: number, toIndex: number, attributes: TextAttributes): void {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, b.TRTypesetterGetLength(handle));

    const prepared = prepareAttributes(attributes);
    if (attributes.replacement !== undefined) {
      this.mayHaveReplacement = true;
    }
    try {
      if (fromIndex === toIndex) {
        return;
      }
      for (const { name, attribute } of prepared) {
        // The typesetter and the object of the attribute are held, since a `computeRoom` can run
        // while the paragraphs are shaped.
        const objects = typeof attribute.value === "object" ? [attribute.value] : [];
        const set = holding([handle, ...objects], ([typesetter, ...copies]) =>
          b.TRTypesetterSetAttribute(typesetter, fromIndex, toIndex - fromIndex, copies.length === 0 ? attribute : { ...attribute, value: copies[0] as Handle<string> }));
        if (!set) {
          throw new Error(`Could not set the attribute: ${name}`);
        }
      }
    } finally {
      disposeTemporaries(prepared);
    }
  }

  /**
   * Removes attributes from the code units from `fromIndex` up to `toIndex`. An attribute that is
   * not set there is left as it is.
   *
   * Removing `replacement` does not reset what the typesetter remembers about replacements: one on
   * which a replacement was ever set is still refused by the typesetter of a `TLabel` or `TTextView`
   * (which cannot tell whether one is left), also after the last one was removed. Make a new one if
   * that matters.
   *
   * @throws {RangeError} If the range is not within the text.
   * @throws TypeError if a name is not an attribute.
   */
  removeAttributes(fromIndex: number, toIndex: number, ...names: TextAttributeName[]): void {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, b.TRTypesetterGetLength(handle));

    const types = names.map((name) => attributeType(name));
    if (fromIndex === toIndex) {
      return;
    }
    for (const [position, type] of types.entries()) {
      if (!this.#shaping((held) => b.TRTypesetterRemoveAttribute(held, fromIndex, toIndex - fromIndex, type))) {
        throw new Error(`Could not remove the attribute: ${String(names[position])}`);
      }
    }
  }

  // An edit shapes the paragraphs it touches, which can run the `computeRoom` of a replacement. That
  // may dispose this object, so the call holds a reference of its own.
  #shaping<Result>(body: (handle: Handle<"TRTypesetter">) => Result): Result {
    return holding([this.nativeHandle], ([handle]) => body(handle));
  }
}

setMutableTypesetterFactory((handle) => new MutableTypesetter(adopt, handle));
