import { List } from "../collections/List.js";
import { checkElement, checkRange } from "../collections/ListBounds.js";
import type { NumberList } from "../collections/List.js";
import type { UInt8 } from "../collections/NumberKind.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Script } from "./enums.js";
import { ScriptRun } from "./ScriptRun.js";

// The scripts are kept in JavaScript memory, as Core and SheenBidi have no table of them: a script
// locator is a cursor that finds one run at a time.
class ScriptList extends List<number> implements NumberList<UInt8> {
  readonly #scripts: Uint8Array;
  readonly length: number;

  constructor(scripts: Uint8Array) {
    super();
    this.#scripts = scripts;
    this.length = scripts.length;
  }

  get(index: number): number {
    checkElement("index", index, this.length);
    return this.#scripts[index] as number;
  }

  slice(fromIndex = 0, toIndex: number = this.length): ScriptList {
    checkRange(fromIndex, toIndex, this.length);
    return new ScriptList(this.#scripts.slice(fromIndex, toIndex));
  }

  toTypedArray(): Uint8Array {
    return this.#scripts.slice();
  }
}

function locateScripts(text: string): Uint8Array {
  const b = getNativeBindings();
  const locator = b.SBScriptLocatorCreate();
  if (locator === undefined) {
    throw new Error("Could not create a script locator.");
  }

  try {
    b.SBScriptLocatorLoadCodepoints(locator, text);
    const scripts = new Uint8Array(text.length);
    while (b.SBScriptLocatorMoveNext(locator)) {
      const { offset, length, script } = b.SBScriptLocatorGetAgent(locator);
      scripts.fill(script, offset, offset + length);
    }
    return scripts;
  } finally {
    b.disposeHandle(locator);
  }
}

/**
 * Resolves the script of each character of a text. It holds no native object: the locator that
 * finds the runs is used and disposed by the constructor, so `dispose()` has nothing to release.
 */
export class ScriptClassifier {
  /** The text that the classifier was made for. */
  readonly text: string;
  readonly #scripts: Uint8Array;
  #isDisposed = false;

  /**
   * Classifies the text.
   *
   * @throws TypeError if the text is not a string.
   */
  constructor(text: string) {
    if (typeof text !== "string") {
      throw new TypeError("text must be a string.");
    }
    this.#scripts = locateScripts(text);
    this.text = text;
  }

  /** Tells whether `dispose()` has been called. It does not make the classifier unusable. */
  get isDisposed(): boolean {
    return this.#isDisposed;
  }

  /**
   * Does nothing but remember that it was called, and can be called any number of times. Tehreer-Web's
   * classifier owns native memory and has to be disposed; this one holds only JavaScript memory, so
   * there is nothing to give back, but code ported from Web (and `using`) keeps working.
   */
  dispose(): void {
    this.#isDisposed = true;
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  /** The resolved script of each character of the text. */
  get charScripts(): NumberList<UInt8> {
    return new ScriptList(this.#scripts);
  }

  /** The runs of the resolved scripts in the text. */
  get scriptRuns(): Iterable<ScriptRun> {
    return this.getScriptRuns(0, this.text.length);
  }

  /**
   * Returns the runs of the resolved scripts in a range of the text.
   *
   * @throws {RangeError} If the range is not inside of the text.
   */
  getScriptRuns(fromIndex: number, toIndex: number): Iterable<ScriptRun> {
    checkRange(fromIndex, toIndex, this.text.length);
    return { [Symbol.iterator]: () => this.#scriptRuns(fromIndex, toIndex) };
  }

  *#scriptRuns(fromIndex: number, toIndex: number): Generator<ScriptRun> {
    const scripts = this.#scripts;
    let index = fromIndex;
    while (index < toIndex) {
      const script = scripts[index] as number;
      let next = index + 1;
      while (next < toIndex && scripts[next] === script) {
        next++;
      }
      yield new ScriptRun(index, next, script as Script);
      index = next;
    }
  }
}
