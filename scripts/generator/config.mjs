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

/** Headers that need another library's headers just to be included. */
export const SKIP_INCLUDES = ["TRSheenBidi.h"];
