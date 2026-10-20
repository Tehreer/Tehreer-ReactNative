import { coreNumbers } from "../collections/CoreList.js";
import type { NumberList } from "../collections/List.js";
import type { UInt8 } from "../collections/NumberKind.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { NativeObject } from "../internal/NativeObject.js";
import { BaseDirection, MAX_BASE_LEVEL, MAX_BIDI_LEVEL } from "./BaseDirection.js";
import { BidiParagraph } from "./BidiParagraph.js";

/**
 * Applies the Unicode Bidirectional Algorithm on a text.
 *
 * The native side keeps a UTF-16 copy of the text for as long as the algorithm, or a paragraph or
 * a line made from it, is alive: disposing the algorithm first does not invalidate them.
 */
export class BidiAlgorithm extends NativeObject<"SBAlgorithm"> {
  /** The greatest embedding level that text can have. */
  static readonly MAX_LEVEL = MAX_BIDI_LEVEL;

  /** The greatest level that {@link BidiAlgorithm.createParagraph} takes as a base: SheenBidi reads 125 as "find the direction". */
  static readonly MAX_BASE_LEVEL = MAX_BASE_LEVEL;

  // The length of the text is a fact that does not change, and the ranges are checked against it
  // here because SheenBidi clamps a range instead of refusing it.
  readonly #length: number;

  /**
   * Makes a bidi algorithm object for a text.
   *
   * @throws {RangeError} If the text is empty.
   * @throws {Error} If SheenBidi cannot make the object.
   */
  constructor(text: string) {
    if (typeof text !== "string") {
      throw new TypeError("text must be a string.");
    }
    if (text.length === 0) {
      throw new RangeError("Text is empty.");
    }

    const created = getNativeBindings().SBAlgorithmCreate(text);
    if (created === undefined) {
      throw new Error("Could not create a bidi algorithm.");
    }

    super(created);
    this.#length = text.length;
  }

  /** The bidi class of each character of the text, which is valid while the algorithm is not disposed. */
  get charBidiClasses(): NumberList<UInt8> {
    const handle = this.nativeHandle;
    return coreNumbers(this, getNativeBindings().SBAlgorithmGetBidiTypesPtr(handle), this.#length, "UInt8");
  }

  /**
   * Finds the boundary of the first paragraph in a range of the text.
   *
   * The boundary comes after a character whose bidi class is Paragraph Separator, or at `toIndex`
   * if there is none before it. A carriage return that is followed by a line feed is the
   * exception: the boundary comes after both.
   *
   * @param fromIndex The index of the first character of the paragraph in the source text.
   * @param toIndex The suggested index after the last character of the paragraph.
   * @returns The index after the last character of the paragraph.
   * @throws {RangeError} If the range is empty or not inside of the text.
   */
  getParagraphBoundary(fromIndex: number, toIndex: number): number {
    const handle = this.nativeHandle;
    this.#checkSubRange(fromIndex, toIndex);

    const { actualLength } = getNativeBindings().SBAlgorithmGetParagraphBoundary(handle, fromIndex, toIndex - fromIndex);
    return fromIndex + actualLength;
  }

  /**
   * Makes the first paragraph that starts at `fromIndex` and ends at `toIndex` or before it, as
   * the rule P1 says. The base level is found by the rules P2 and P3, or it is the one that is
   * given, and the embedding levels are resolved by the rules X1 to I2.
   *
   * @param fromIndex The index of the first character of the paragraph in the source text.
   * @param toIndex The suggested index after the last character of the paragraph.
   * @param base A base direction, or a base level from 0 up to {@link BidiAlgorithm.MAX_BASE_LEVEL}.
   * @throws {RangeError} If the range is empty or not inside of the text, or the base is not valid.
   * @throws {Error} If SheenBidi cannot make the paragraph.
   */
  createParagraph(fromIndex: number, toIndex: number, base: BaseDirection | number): BidiParagraph {
    const handle = this.nativeHandle;
    this.#checkSubRange(fromIndex, toIndex);
    if (
      !Number.isInteger(base) ||
      !(base === BaseDirection.DefaultLeftToRight || base === BaseDirection.DefaultRightToLeft || (base >= 0 && base <= MAX_BASE_LEVEL))
    ) {
      throw new RangeError(`The base (${base}) is neither a base direction nor a level from 0 to ${MAX_BASE_LEVEL}.`);
    }

    const paragraph = getNativeBindings().SBAlgorithmCreateParagraph(handle, fromIndex, toIndex - fromIndex, base);
    if (paragraph === undefined) {
      throw new Error("Could not create a bidi paragraph.");
    }

    return BidiParagraph.adopting(paragraph);
  }

  #checkSubRange(fromIndex: number, toIndex: number): void {
    const length = this.#length;
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || toIndex > length || toIndex <= fromIndex) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not a range inside of the text 0..${length}.`);
    }
  }
}
