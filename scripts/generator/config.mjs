// Copyright (C) 2026 Muhammad Tayyab Akram
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// What the generator is told about Core that the headers do not say. Every name here must still be
// declared by a header, and every entry says why, so a stale entry fails the generator.

/** Declared by Core but not implemented, or needing the headers of another library. */
export const EXCLUDED = new Set(["TRVersionGetString", "TRTextGetSheenBidiText"]);

/**
 * Functions whose signature is a native concern, not a binding: they carry C function pointers
 * that stay in C++ (the draw callbacks and the destroy function of native data), raw pointers
 * that only native code can hold, or a union that a hand-written codec writes. cpp/runtime binds
 * them by hand.
 */
export const MANUAL = new Map([
  ["TRRendererGetDrawCallbacks", "fills a struct of C function pointers, which only native painters use"],
  ["TRRendererSetDrawCallbacks", "takes C function pointers that the native painter implements"],
  ["TRRendererGetDrawUserData", "returns the opaque pointer of the native painter"],
  ["TRGlyphImageGetNativeData", "returns the platform object that the native painter attached"],
  ["TRGlyphImageSetNativeData", "takes a platform object and a C destroy function"],
  ["TRReplacementCreate", "keeps C callbacks and userData after the call, so they need the handler table"],
  ["TRTextSetAttribute", "takes the union TRAttributeValue, which the attribute codec writes"],
  ["TRTypesetterCreate", "takes an array of TRAttribute, which the attribute codec writes"],
]);

/**
 * The element count of a buffer that no parameter of the signature gives. `{name}` stands for
 * the parameter `name`; the expression is evaluated after the arguments have been read.
 */
export const BOUNDS = {
  TRShapingResultGetCaretEdges: {
    caretStops: { count: "TRShapingResultGetCodeUnitCount({result})" },
    caretEdges: { count: "TRShapingResultGetCodeUnitCount({result}) + 1" },
  },
};

/**
 * The number of elements behind each getter that returns a pointer into Core memory. The binding
 * records it in the `PointerView`, so the runtime can refuse a count that is larger than what Core
 * has, whatever JavaScript asks for. `{name}` stands for a parameter; the expression is evaluated
 * after the getter returned. A getter that is not listed stops the generator, so a new one cannot
 * be added without saying how long its array is.
 */
export const POINTER_COUNTS = {
  TRAttributeListGetItem: "1",
  TRFontFeaturesGetItemsPtr: "TRFontFeaturesGetCount({features})",
  TRGlyphImageGetPixelsPtr: "TRGlyphImageGetByteCount({image})",
  TRGlyphRunGetGlyphIDsPtr: "TRGlyphRunGetGlyphCount({run})",
  TRGlyphRunGetGlyphOffsetsPtr: "TRGlyphRunGetGlyphCount({run})",
  TRGlyphRunGetGlyphAdvancesPtr: "TRGlyphRunGetGlyphCount({run})",
  TRGlyphRunGetClusterMapPtr: "TRGlyphRunGetClusterMapCount({run})",
  TRShapingEngineGetOpenTypeFeaturesPtr: "TRShapingEngineGetOpenTypeFeatureCount({engine})",
  TRShapingResultGetGlyphIDsPtr: "TRShapingResultGetGlyphCount({result})",
  TRShapingResultGetGlyphOffsetsPtr: "TRShapingResultGetGlyphCount({result})",
  TRShapingResultGetGlyphAdvancesPtr: "TRShapingResultGetGlyphCount({result})",
  TRShapingResultGetClusterMapPtr: "TRShapingResultGetCodeUnitCount({result})",
  TRTypefaceGetVariationAxesPtr: "TRTypefaceGetVariationAxisCount({typeface})",
  TRTypefaceGetNamedStylesPtr: "TRTypefaceGetNamedStyleCount({typeface})",
  TRTypefaceGetPaletteEntriesPtr: "TRTypefaceGetPaletteEntryCount({typeface})",
  TRTypefaceGetPredefinedPalettesPtr: "TRTypefaceGetPredefinedPaletteCount({typeface})",
  TRTypefaceGetBitmapStrikesPtr: "TRTypefaceGetBitmapStrikeCount({typeface})",
  TRTypefaceGetVariationCoordinatesPtr: "TRTypefaceGetVariationAxisCount({typeface})",
  TRTypefaceGetAssociatedColorsPtr: "TRTypefaceGetPaletteEntryCount({typeface})",
};

/** Headers that need another library's headers just to be included. */
export const SKIP_INCLUDES = ["TRSheenBidi.h"];

/**
 * The pointers that Core fills in with exactly one value. A mutable `T *` is only taken for a
 * single value when it is listed here, because Core could as well write an array through it and
 * the signature does not tell; an unlisted one stops the generator. `{ function: [parameters] }`.
 */
export const SCALAR_OUTS = {
  TRComposedLineGetCodeUnitDistance: ["distance"],
  TRGlyphRunGetCodeUnitDistance: ["distance"],
  TRGlyphRunGetForegroundColor: ["foregroundColor"],
  TRGlyphRunGetBackgroundColor: ["backgroundColor"],
  TRGlyphRunGetDecorationColor: ["decorationColor"],
  TRLineLocatorGetLineBox: ["box"],
  TRReplacementComputeRoom: ["room"],
  TRTextCopyAttributes: ["outLength"],
};
