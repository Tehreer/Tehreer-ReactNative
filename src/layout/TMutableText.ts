import { checkRange } from "../collections/ListBounds.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { attributeType, disposeTemporaries, prepareAttributes } from "./TextAttributeCodec.js";
import type { TextAttributeName, TextAttributes } from "./TextAttributes.js";
import { setMutableTextFactory, toCodeUnits, TText, UTF16 } from "./TText.js";

/**
 * Text that can be edited. A range that an edit puts in takes the attributes of what it replaces.
 *
 * A mutable text is not thread safe: do not change it while something lays it out. Take a copy with
 * `copy()` to lay it out while the text is edited.
 */
export class TMutableText extends TText {
  /**
   * Makes a mutable text, which starts with the string if there is one.
   *
   * @throws TypeError if `text` is not a string.
   * @throws Error if Core cannot create the text.
   */
  constructor(text?: string);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRText">);
  constructor(text?: string | typeof adopt, handle?: Handle<"TRText">) {
    if (text === adopt) {
      super(adopt, handle as Handle<"TRText">);
      return;
    }

    // The string is checked first, so that a bad argument creates nothing.
    const units = text === undefined ? undefined : toCodeUnits(text);
    const created = getNativeBindings().TRTextCreateMutable(UTF16);
    if (created === undefined) {
      throw new Error("Could not create a mutable text.");
    }
    super(adopt, created);

    if (units !== undefined && units.length > 0) {
      try {
        this.append(text as string);
      } catch (error) {
        this.dispose();
        throw error;
      }
    }
  }

  /**
   * Starts a batch of edits, whose analysis is deferred until `endEditing()`. Batches do not nest.
   */
  beginEditing(): void {
    getNativeBindings().TRTextBeginEditing(this.nativeHandle);
  }

  /** Ends a batch of edits, and analyzes the paragraphs that changed. */
  endEditing(): void {
    getNativeBindings().TRTextEndEditing(this.nativeHandle);
  }

  /** Runs the edits that a function makes as one batch, which ends even if the function throws. */
  edit(body: (text: this) => void): void {
    this.beginEditing();
    try {
      body(this);
    } finally {
      this.endEditing();
    }
  }

  /**
   * Adds a string to the end.
   *
   * @throws TypeError if `text` is not a string.
   */
  append(text: string): void {
    const units = toCodeUnits(text);
    const handle = this.nativeHandle;
    if (units.length === 0) {
      return;
    }
    if (!getNativeBindings().TRTextAppendCodeUnits(handle, units, units.length)) {
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
    const b = getNativeBindings();
    const units = toCodeUnits(text);
    const handle = this.nativeHandle;
    checkRange(index, index, b.TRTextGetLength(handle));
    if (units.length === 0) {
      return;
    }
    if (!b.TRTextInsertCodeUnits(handle, index, units, units.length)) {
      throw new Error("Could not insert the string.");
    }
  }

  /**
   * Removes the code units from `fromIndex` up to `toIndex`.
   *
   * @throws {RangeError} If the range is not within the text.
   */
  delete(fromIndex: number, toIndex: number): void {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, b.TRTextGetLength(handle));
    if (fromIndex === toIndex) {
      return;
    }
    if (!b.TRTextDeleteCodeUnits(handle, fromIndex, toIndex - fromIndex)) {
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
    const b = getNativeBindings();
    const units = toCodeUnits(text);
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, b.TRTextGetLength(handle));
    // Core accepts no buffer for no code units, which only deletes the range.
    if (!b.TRTextReplaceCodeUnits(handle, fromIndex, toIndex - fromIndex, units.length === 0 ? undefined : units, units.length)) {
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
    if (!getNativeBindings().TRTextSetCodeUnits(this.nativeHandle, units.length === 0 ? undefined : units, units.length)) {
      throw new Error("Could not set the string.");
    }
  }

  /**
   * Sets attributes on the code units from `fromIndex` up to `toIndex`. An attribute that is
   * already set in a part of the range is replaced there. The text retains what the attributes
   * refer to, such as a typeface, so they can be disposed after the call. Invalid arguments are
   * refused before the first attribute is set; a failure inside Core can still leave the earlier
   * members set.
   *
   * @throws {RangeError} If the range is not within the text, or a number is not valid.
   * @throws TypeError if a name is not an attribute or a value is of the wrong type.
   * @throws Error if Core refuses an attribute.
   */
  setAttributes(fromIndex: number, toIndex: number, attributes: TextAttributes): void {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, b.TRTextGetLength(handle));

    const prepared = prepareAttributes(attributes);
    if (attributes.replacement !== undefined) {
      this.mayHaveReplacement = true;
    }
    try {
      if (fromIndex === toIndex) {
        return;
      }
      for (const { name, attribute } of prepared) {
        if (!b.TRTextSetAttribute(handle, fromIndex, toIndex - fromIndex, attribute)) {
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
   * @throws {RangeError} If the range is not within the text.
   * @throws TypeError if a name is not an attribute.
   */
  removeAttributes(fromIndex: number, toIndex: number, ...names: TextAttributeName[]): void {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    checkRange(fromIndex, toIndex, b.TRTextGetLength(handle));

    const types = names.map((name) => attributeType(name));
    if (fromIndex === toIndex) {
      return;
    }
    for (const [position, type] of types.entries()) {
      if (!b.TRTextRemoveAttribute(handle, fromIndex, toIndex - fromIndex, type)) {
        throw new Error(`Could not remove the attribute: ${String(names[position])}`);
      }
    }
  }
}

setMutableTextFactory((handle) => new TMutableText(adopt, handle));
