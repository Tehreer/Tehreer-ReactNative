import { getNativeBindings } from "../internal/NativeBindings.js";
import type { BidiClass, GeneralCategory, Script } from "./enums.js";

/** Properties of a Unicode code point. */
export const CodePoint = {
  /** Returns the bidi class of a code point. */
  getBidiClass(codePoint: number): BidiClass {
    return getNativeBindings().SBCodepointGetBidiType(codePoint) as BidiClass;
  },

  /** Returns the general category of a code point. */
  getGeneralCategory(codePoint: number): GeneralCategory {
    return getNativeBindings().SBCodepointGetGeneralCategory(codePoint) as GeneralCategory;
  },

  /** Returns the script of a code point. */
  getScript(codePoint: number): Script {
    return getNativeBindings().SBCodepointGetScript(codePoint) as Script;
  },

  /** Returns the mirror of a code point, or 0 if it has none. */
  getMirror(codePoint: number): number {
    return getNativeBindings().SBCodepointGetMirror(codePoint) >>> 0;
  },
} as const;
