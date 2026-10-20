import { coreNumbers } from "../collections/CoreList.js";
import type { NumberList } from "../collections/List.js";
import type { UInt8 } from "../collections/NumberKind.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { BidiLine } from "./BidiLine.js";
import { BidiRun } from "./BidiRun.js";

/**
 * A paragraph of text, processed with the rules of the Unicode Bidirectional Algorithm. It keeps
 * the text alive, so it is valid after the algorithm that made it is disposed.
 */
export class BidiParagraph extends NativeObject<"SBParagraph"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"SBParagraph">) {
    if (token !== adopt) {
      throw new Error("A bidi paragraph is made by a bidi algorithm.");
    }
    super(handle);
  }

  /** The index of the first character of the paragraph in the source text. */
  get startIndex(): number {
    return getNativeBindings().SBParagraphGetOffset(this.nativeHandle);
  }

  /** The index after the last character of the paragraph in the source text. */
  get endIndex(): number {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return b.SBParagraphGetOffset(handle) + b.SBParagraphGetLength(handle);
  }

  /** The base level of the paragraph. */
  get baseLevel(): number {
    return getNativeBindings().SBParagraphGetBaseLevel(this.nativeHandle);
  }

  /** The embedding level of each character of the paragraph, which is valid while it is not disposed. */
  get charLevels(): NumberList<UInt8> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreNumbers(this, b.SBParagraphGetLevelsPtr(handle), b.SBParagraphGetLength(handle), "UInt8");
  }

  /** The runs of the paragraph in their logical order. The paragraph must not be disposed while they are iterated. */
  get logicalRuns(): Iterable<BidiRun> {
    return { [Symbol.iterator]: () => this.#logicalRuns() };
  }

  *#logicalRuns(): Generator<BidiRun> {
    const start = this.startIndex;
    // One copy instead of a read for each character.
    const levels = this.charLevels.toTypedArray();
    let index = 0;
    while (index < levels.length) {
      const level = levels[index] as number;
      let next = index + 1;
      while (next < levels.length && levels[next] === level) {
        next++;
      }
      yield new BidiRun(start + index, start + next, level);
      index = next;
    }
  }

  /**
   * Makes a line of the paragraph by applying the rules L1 and L2 of the Unicode Bidirectional
   * Algorithm.
   *
   * @param fromIndex The index of the first character of the line in the source text.
   * @param toIndex The index after the last character of the line in the source text.
   * @throws {RangeError} If the range is empty or not inside of the paragraph.
   * @throws {Error} If SheenBidi cannot make the line.
   */
  createLine(fromIndex: number, toIndex: number): BidiLine {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    const start = b.SBParagraphGetOffset(handle);
    const end = start + b.SBParagraphGetLength(handle);
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < start || toIndex > end || toIndex <= fromIndex) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not a range inside of the paragraph ${start}..${end}.`);
    }

    const line = b.SBParagraphCreateLine(handle, fromIndex, toIndex - fromIndex);
    if (line === undefined) {
      throw new Error("Could not create a bidi line.");
    }

    return BidiLine.adopting(line);
  }
}
