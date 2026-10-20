import { coreStructs } from "../collections/CoreList.js";
import { IndexedList } from "../collections/IndexedList.js";
import type { List } from "../collections/List.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import type { SBRun } from "../internal/SheenBidiFunctions.js";
import { BidiPair } from "./BidiPair.js";
import { BidiRun } from "./BidiRun.js";

/**
 * A line of a paragraph, processed with the rules L1 and L2 of the Unicode Bidirectional Algorithm.
 * It keeps the text alive, so it is valid after the paragraph and the algorithm are disposed.
 */
export class BidiLine extends NativeObject<"SBLine"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"SBLine">) {
    if (token !== adopt) {
      throw new Error("A bidi line is made by a bidi paragraph.");
    }
    super(handle);
  }

  /** The index of the first character of the line in the source text. */
  get startIndex(): number {
    return getNativeBindings().SBLineGetOffset(this.nativeHandle);
  }

  /** The index after the last character of the line in the source text. */
  get endIndex(): number {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return b.SBLineGetOffset(handle) + b.SBLineGetLength(handle);
  }

  /** The runs of the line in their visual order, which are read when they are asked for. */
  get visualRuns(): List<BidiRun> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    const count = b.SBLineGetRunCount(handle);
    const runs = coreStructs<SBRun>(this, b.SBLineGetRunsPtr(handle), count);
    return new IndexedList(this, count, (index) => {
      const run = runs.get(index);
      return new BidiRun(run.offset, run.offset + run.length, run.level);
    });
  }

  /**
   * The characters of the line that have to be mirrored, in their logical order. They are the
   * means to implement the rule L4 of the Unicode Bidirectional Algorithm. The line is read when
   * the iteration starts, and the locator keeps what it needs of it, so disposing the line
   * during the iteration does no harm.
   */
  get mirroringPairs(): Iterable<BidiPair> {
    return { [Symbol.iterator]: () => this.#mirroringPairs() };
  }

  *#mirroringPairs(): Generator<BidiPair> {
    const b = getNativeBindings();
    const line = this.nativeHandle;
    const locator = b.SBMirrorLocatorCreate();
    if (locator === undefined) {
      throw new Error("Could not create a mirror locator.");
    }

    try {
      b.SBMirrorLocatorLoadLine(locator, line);
      while (b.SBMirrorLocatorMoveNext(locator)) {
        const { index, codepoint, mirror } = b.SBMirrorLocatorGetAgent(locator);
        yield new BidiPair(index, codepoint, mirror);
      }
    } finally {
      b.disposeHandle(locator);
    }
  }
}
