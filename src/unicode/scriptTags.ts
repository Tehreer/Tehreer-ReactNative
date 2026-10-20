import { getNativeBindings } from "../internal/NativeBindings.js";
import type { SfntTag } from "../sfnt/SfntTag.js";

/** @internal */
export function getScriptOpenTypeTag(script: number): SfntTag {
  return getNativeBindings().SBScriptGetOpenTypeTag(script) >>> 0;
}

/** @internal */
export function getScriptUnicodeTag(script: number): SfntTag {
  return getNativeBindings().SBScriptGetUnicodeTag(script) >>> 0;
}
