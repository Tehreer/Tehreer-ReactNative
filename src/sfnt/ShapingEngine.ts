import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { adopt } from "../internal/Adopt.js";
import { ShapingOrder, WritingDirection } from "./enums.js";
import type { OpenTypeFeature } from "./OpenTypeFeature.js";
import type { SfntTag } from "./SfntTag.js";
import { ShapingResult } from "./ShapingResult.js";

/**
 * What a shaping engine needs of a typeface: the handle of the object of Core. The `Typeface`
 * class of the graphics package satisfies it, so the engine does not depend on that package.
 */
export interface ShapingTypeface {
  /** @internal */
  readonly nativeHandle: Handle<"TRTypeface">;
}

/**
 * Shapes text into glyphs. It is a mutable configuration object and not thread safe: do not change
 * it while something shapes with it. It is created with no typeface, a type size of 16, the script
 * `DFLT`, the language `dflt`, left to right direction, forward order and no features.
 */
export class ShapingEngine extends NativeObject<"TRShapingEngine"> {
  // Core retains the typeface and copies the features, but cannot give back the wrapper object or
  // the exact list that was set, so they are kept here (section 6 of the skill).
  #typeface: ShapingTypeface | undefined;
  #openTypeFeatures: readonly OpenTypeFeature[] = [];

  /** @throws Error if Core cannot create the engine. */
  constructor();
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRShapingEngine">);
  constructor(token?: typeof adopt, handle?: Handle<"TRShapingEngine">) {
    if (token === adopt) {
      super(handle as Handle<"TRShapingEngine">);
      return;
    }

    const created = getNativeBindings().TRShapingEngineCreate();
    if (created === undefined) {
      throw new Error("Could not create a shaping engine.");
    }
    super(created);
  }

  /** Returns the direction in which text of a script is written by default. */
  static getScriptDefaultDirection(scriptTag: SfntTag): WritingDirection {
    return getNativeBindings().TRShapingEngineGetScriptDefaultDirection(scriptTag) as WritingDirection;
  }

  /**
   * Returns the OpenType tag of a language given as a BCP 47 name such as `ur-PK`, or the tag of
   * `dflt` if it has none.
   */
  static getLanguageTag(languageName: string): SfntTag {
    return getNativeBindings().TRShapingEngineGetLanguageTagForName(languageName) >>> 0;
  }

  /**
   * The typeface to shape with, or `undefined` for none, which makes shaping fail. It is the object
   * that was set, which the engine only keeps for the getter: Core retains its own reference, so
   * the returned wrapper may be disposed while the engine keeps shaping with the typeface.
   * `ShapingTypeface` is temporary, until the `Typeface` class of #15 replaces it.
   */
  get typeface(): ShapingTypeface | undefined {
    return this.#typeface;
  }

  set typeface(value: ShapingTypeface | undefined) {
    getNativeBindings().TRShapingEngineSetTypeface(this.nativeHandle, value?.nativeHandle);
    this.#typeface = value;
  }

  /** The size of the em square that the results are measured in. */
  get typeSize(): number {
    return getNativeBindings().TRShapingEngineGetTypeSize(this.nativeHandle);
  }

  set typeSize(value: number) {
    getNativeBindings().TRShapingEngineSetTypeSize(this.nativeHandle, value);
  }

  /** The OpenType tag of the script of the text. */
  get scriptTag(): SfntTag {
    return getNativeBindings().TRShapingEngineGetScriptTag(this.nativeHandle) >>> 0;
  }

  set scriptTag(value: SfntTag) {
    getNativeBindings().TRShapingEngineSetScriptTag(this.nativeHandle, value);
  }

  /** The OpenType tag of the language of the text. */
  get languageTag(): SfntTag {
    return getNativeBindings().TRShapingEngineGetLanguageTag(this.nativeHandle) >>> 0;
  }

  set languageTag(value: SfntTag) {
    getNativeBindings().TRShapingEngineSetLanguageTag(this.nativeHandle, value);
  }

  /** The direction in which the text is written. */
  get writingDirection(): WritingDirection {
    return getNativeBindings().TRShapingEngineGetWritingDirection(this.nativeHandle) as WritingDirection;
  }

  set writingDirection(value: WritingDirection) {
    getNativeBindings().TRShapingEngineSetWritingDirection(this.nativeHandle, value);
  }

  /** The order in which the code units are shaped. */
  get shapingOrder(): ShapingOrder {
    return getNativeBindings().TRShapingEngineGetShapingOrder(this.nativeHandle) as ShapingOrder;
  }

  set shapingOrder(value: ShapingOrder) {
    getNativeBindings().TRShapingEngineSetShapingOrder(this.nativeHandle, value);
  }

  /** The features to shape with, as they were set. */
  get openTypeFeatures(): readonly OpenTypeFeature[] {
    return this.#openTypeFeatures;
  }

  /**
   * @throws Error if Core cannot store the features; the previous ones are kept.
   */
  set openTypeFeatures(features: readonly OpenTypeFeature[]) {
    const copy = features.map(({ tag, value }): OpenTypeFeature => ({ tag, value }));
    if (!getNativeBindings().TRShapingEngineSetOpenTypeFeatures(this.nativeHandle, copy, copy.length)) {
      throw new Error("Could not set the OpenType features.");
    }

    this.#openTypeFeatures = copy;
  }

  /**
   * Shapes the code units of the text from `fromIndex` up to `toIndex`.
   *
   * @throws RangeError if the range is not within the text.
   * @throws Error if the engine has no typeface or Core fails to shape.
   */
  shapeText(text: string, fromIndex = 0, toIndex: number = text.length): ShapingResult {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex < 0 || fromIndex > toIndex || toIndex > text.length) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not within the text of ${text.length} code units.`);
    }

    const units = new Uint16Array(toIndex - fromIndex);
    for (let index = 0; index < units.length; index++) {
      units[index] = text.charCodeAt(fromIndex + index);
    }

    // 1 is TRStringEncodingUTF16.
    const handle = getNativeBindings().TRShapingEngineCreateShapingResult(this.nativeHandle, units, units.length, 1);
    if (handle === undefined) {
      throw new Error("Could not shape the text: the engine has no typeface, or shaping failed.");
    }

    return ShapingResult.adopting(handle);
  }
}
