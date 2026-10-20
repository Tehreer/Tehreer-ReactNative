import { coreStructs } from "../collections/CoreList.js";
import type { List } from "../collections/List.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import type { OpenTypeFeature } from "./OpenTypeFeature.js";

function createFeatures(features: readonly OpenTypeFeature[]): Handle<"TRFontFeatures"> {
  const handle = getNativeBindings().TRFontFeaturesCreate(features.map(({ tag, value }) => ({ tag, value })), features.length);
  if (handle === undefined) {
    throw new Error("Could not create font features.");
  }

  return handle;
}

/** An immutable set of OpenType features, which text can carry as an attribute. */
export class FontFeatures extends NativeObject<"TRFontFeatures"> {
  /**
   * @throws Error if Core cannot create the set.
   * @throws TypeError if a feature is not a `{ tag, value }` pair of numbers.
   * @throws RangeError if a tag or a value is not an unsigned 32-bit integer.
   */
  constructor(features: readonly OpenTypeFeature[]);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRFontFeatures">);
  constructor(features: readonly OpenTypeFeature[] | typeof adopt, handle?: Handle<"TRFontFeatures">) {
    super(features === adopt ? (handle as Handle<"TRFontFeatures">) : createFeatures(features));
  }

  /** The number of features. */
  get count(): number {
    return getNativeBindings().TRFontFeaturesGetCount(this.nativeHandle);
  }

  /**
   * The features, in the order that they were given. The list reads Core's memory when an element
   * is asked for and fails once this object is disposed.
   */
  get items(): List<OpenTypeFeature> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreStructs<OpenTypeFeature>(this, b.TRFontFeaturesGetItemsPtr(handle), b.TRFontFeaturesGetCount(handle));
  }
}
