/*
 * Copyright (C) 2026 Muhammad Tayyab Akram
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// GENERATED FILE. DO NOT EDIT.
// Written by scripts/generate-bindings.mjs from Libraries/TehreerCore/Headers/Tehreer.
// Change the generator or the Core header, then run `npm run generate`.
//
// How Core values cross into JavaScript:
//
// - Integers, floats, tags, colors, glyph ids and enumerations are numbers. A `TRUInteger` of
//   `TRInvalidIndex` is -1, and -1 is `TRInvalidIndex` when passed.
// - `TRBoolean` is a boolean.
// - An object reference is an opaque `Handle`. A function that creates or copies an object hands
//   over a reference that the handle owns; one that gets an object retains it for the handle. A
//   `NULL` result is `undefined`. A parameter that Core documents as optional also takes
//   `undefined`.
//   The `TR*Release` functions are not bound: a handle releases its one reference when it is
//   disposed or collected, and a release from JavaScript would free it twice. `TR*Retain` is bound
//   and gives a new handle with its own reference.
// - A struct that is passed or returned by value is an object with the names of its members.
// - Text goes in as a `string` (`const char *`, `TRStringView`) and comes back as a `string`.
//   Code units go in as an `ArrayBuffer` or a typed array together with their count.
// - A pointer that Core gives into its own memory is a `PointerView`: the address and the owner that
//   keeps it alive, whose length comes from the matching count function.
// - A parameter that Core fills in is not a parameter: its value is in the result. A function that
//   returns `TRBoolean` and fills in values gives `undefined` when the flag is false, else the
//   values (the value itself for one, an object by name for more). If it returns anything else, the
//   result is an object with `result` and one member for each value.
// - An enumeration with a callback gives the collected items as an array in the result, under
//   `items` when there are other values. Nothing calls back into JavaScript.

declare const handleKind: unique symbol;
declare const pointerElement: unique symbol;

/** An opaque reference to a Core object of the given kind, such as `"TRTypeface"`. */
export interface Handle<Kind extends string> {
  readonly [handleKind]: Kind;
}

/** A pointer into Core memory with the name of the type of its elements. */
export interface PointerView<Element extends string> {
  readonly [pointerElement]: Element;
}

/** `TRPoint` */
export interface TRPoint {
  x: number;
  y: number;
}

/** `TRSize` */
export interface TRSize {
  width: number;
  height: number;
}

/** `TRRect` */
export interface TRRect {
  origin: TRPoint;
  size: TRSize;
}

/** `TROpenTypeFeature` */
export interface TROpenTypeFeature {
  tag: number;
  value: number;
}

/** `TRAffineTransform` */
export interface TRAffineTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

/** `TRReplacementRoom` */
export interface TRReplacementRoom {
  ascent: number;
  descent: number;
  extent: number;
}

/** The functions of Tehreer Core that the native module installs. */
export interface NativeFunctions {
  /** `const TRAttribute *TRAttributeListGetItem(TRAttributeListRef list, TRUInteger index)` */
  TRAttributeListGetItem(list: Handle<"TRAttributeList">, index: number): PointerView<"TRAttribute"> | undefined;
  /** `TRUInteger TRAttributeListGetCount(TRAttributeListRef list)` */
  TRAttributeListGetCount(list: Handle<"TRAttributeList">): number;
  /** `TRAttributeListRef TRAttributeListRetain(TRAttributeListRef list)` (the handle owns the reference) */
  TRAttributeListRetain(list: Handle<"TRAttributeList">): Handle<"TRAttributeList"> | undefined;
  /** `TRUInteger TRComposedFrameGetStartIndex(TRComposedFrameRef frame)` */
  TRComposedFrameGetStartIndex(frame: Handle<"TRComposedFrame">): number;
  /** `TRUInteger TRComposedFrameGetEndIndex(TRComposedFrameRef frame)` */
  TRComposedFrameGetEndIndex(frame: Handle<"TRComposedFrame">): number;
  /** `TRFloat TRComposedFrameGetWidth(TRComposedFrameRef frame)` */
  TRComposedFrameGetWidth(frame: Handle<"TRComposedFrame">): number;
  /** `TRFloat TRComposedFrameGetHeight(TRComposedFrameRef frame)` */
  TRComposedFrameGetHeight(frame: Handle<"TRComposedFrame">): number;
  /** `TRUInteger TRComposedFrameGetLineCount(TRComposedFrameRef frame)` */
  TRComposedFrameGetLineCount(frame: Handle<"TRComposedFrame">): number;
  /** `TRComposedLineRef TRComposedFrameGetLine(TRComposedFrameRef frame, TRUInteger index)` (the handle retains the reference) */
  TRComposedFrameGetLine(frame: Handle<"TRComposedFrame">, index: number): Handle<"TRComposedLine"> | undefined;
  /** `TRUInteger TRComposedFrameGetLineIndexForCodeUnit(TRComposedFrameRef frame, TRUInteger codeUnitIndex)` */
  TRComposedFrameGetLineIndexForCodeUnit(frame: Handle<"TRComposedFrame">, codeUnitIndex: number): number;
  /** `TRUInteger TRComposedFrameGetLineIndexAtPosition(TRComposedFrameRef frame, TRPoint position)` */
  TRComposedFrameGetLineIndexAtPosition(frame: Handle<"TRComposedFrame">, position: TRPoint): number;
  /** `TRBoolean TRComposedFrameEnumerateSelection(TRComposedFrameRef frame, TRUInteger index, TRUInteger length, TRSelectionFunc func, void *userData)` (`undefined` when it returns `TRFalse`) */
  TRComposedFrameEnumerateSelection(frame: Handle<"TRComposedFrame">, index: number, length: number): TRRect[] | undefined;
  /** `void TRComposedFrameDraw(TRComposedFrameRef frame, TRRendererRef renderer, TRPoint origin)` */
  TRComposedFrameDraw(frame: Handle<"TRComposedFrame">, renderer: Handle<"TRRenderer"> | undefined, origin: TRPoint): void;
  /** `TRComposedFrameRef TRComposedFrameRetain(TRComposedFrameRef frame)` (the handle owns the reference) */
  TRComposedFrameRetain(frame: Handle<"TRComposedFrame">): Handle<"TRComposedFrame"> | undefined;
  /** `TRUInteger TRComposedLineGetStartIndex(TRComposedLineRef line)` */
  TRComposedLineGetStartIndex(line: Handle<"TRComposedLine">): number;
  /** `TRUInteger TRComposedLineGetEndIndex(TRComposedLineRef line)` */
  TRComposedLineGetEndIndex(line: Handle<"TRComposedLine">): number;
  /** `TRUInt8 TRComposedLineGetParagraphLevel(TRComposedLineRef line)` */
  TRComposedLineGetParagraphLevel(line: Handle<"TRComposedLine">): number;
  /** `TRPoint TRComposedLineGetOrigin(TRComposedLineRef line)` */
  TRComposedLineGetOrigin(line: Handle<"TRComposedLine">): TRPoint;
  /** `TRFloat TRComposedLineGetAscent(TRComposedLineRef line)` */
  TRComposedLineGetAscent(line: Handle<"TRComposedLine">): number;
  /** `TRFloat TRComposedLineGetDescent(TRComposedLineRef line)` */
  TRComposedLineGetDescent(line: Handle<"TRComposedLine">): number;
  /** `TRFloat TRComposedLineGetLeading(TRComposedLineRef line)` */
  TRComposedLineGetLeading(line: Handle<"TRComposedLine">): number;
  /** `TRFloat TRComposedLineGetWidth(TRComposedLineRef line)` */
  TRComposedLineGetWidth(line: Handle<"TRComposedLine">): number;
  /** `TRFloat TRComposedLineGetHeight(TRComposedLineRef line)` */
  TRComposedLineGetHeight(line: Handle<"TRComposedLine">): number;
  /** `TRFloat TRComposedLineGetTrailingWhitespaceExtent(TRComposedLineRef line)` */
  TRComposedLineGetTrailingWhitespaceExtent(line: Handle<"TRComposedLine">): number;
  /** `TRBoolean TRComposedLineIsBlock(TRComposedLineRef line)` */
  TRComposedLineIsBlock(line: Handle<"TRComposedLine">): boolean;
  /** `TRBoolean TRComposedLineIsTruncated(TRComposedLineRef line)` */
  TRComposedLineIsTruncated(line: Handle<"TRComposedLine">): boolean;
  /** `TRUInteger TRComposedLineGetGlyphRunCount(TRComposedLineRef line)` */
  TRComposedLineGetGlyphRunCount(line: Handle<"TRComposedLine">): number;
  /** `TRGlyphRunRef TRComposedLineGetGlyphRun(TRComposedLineRef line, TRUInteger index)` (the handle retains the reference) */
  TRComposedLineGetGlyphRun(line: Handle<"TRComposedLine">, index: number): Handle<"TRGlyphRun"> | undefined;
  /** `TRBoolean TRComposedLineGetCodeUnitDistance(TRComposedLineRef line, TRUInteger codeUnitIndex, TRFloat *distance)` (`undefined` when it returns `TRFalse`) */
  TRComposedLineGetCodeUnitDistance(line: Handle<"TRComposedLine">, codeUnitIndex: number): number | undefined;
  /** `TRBoolean TRComposedLineEnumerateVisualEdges(TRComposedLineRef line, TRUInteger index, TRUInteger length, TREdgeFunc func, void *userData)` (`undefined` when it returns `TRFalse`) */
  TRComposedLineEnumerateVisualEdges(line: Handle<"TRComposedLine">, index: number, length: number): { left: number; right: number }[] | undefined;
  /** `TRUInteger TRComposedLineGetCodeUnitIndexAtDistance(TRComposedLineRef line, TRFloat distance)` */
  TRComposedLineGetCodeUnitIndexAtDistance(line: Handle<"TRComposedLine">, distance: number): number;
  /** `TRFloat TRComposedLineGetPenOffset(TRComposedLineRef line, TRFloat flushFactor, TRFloat flushExtent)` */
  TRComposedLineGetPenOffset(line: Handle<"TRComposedLine">, flushFactor: number, flushExtent: number): number;
  /** `TRRect TRComposedLineComputeInkBox(TRComposedLineRef line, TRRendererRef renderer)` */
  TRComposedLineComputeInkBox(line: Handle<"TRComposedLine">, renderer: Handle<"TRRenderer">): TRRect;
  /** `void TRComposedLineDraw(TRComposedLineRef line, TRRendererRef renderer, TRPoint origin)` */
  TRComposedLineDraw(line: Handle<"TRComposedLine">, renderer: Handle<"TRRenderer"> | undefined, origin: TRPoint): void;
  /** `TRComposedLineRef TRComposedLineRetain(TRComposedLineRef line)` (the handle owns the reference) */
  TRComposedLineRetain(line: Handle<"TRComposedLine">): Handle<"TRComposedLine"> | undefined;
  /** `TRFontFeaturesRef TRFontFeaturesCreate(const TROpenTypeFeature *features, TRUInteger count)` (the handle owns the reference) */
  TRFontFeaturesCreate(features: readonly TROpenTypeFeature[] | undefined, count: number): Handle<"TRFontFeatures"> | undefined;
  /** `const TROpenTypeFeature *TRFontFeaturesGetItemsPtr(TRFontFeaturesRef features)` */
  TRFontFeaturesGetItemsPtr(features: Handle<"TRFontFeatures">): PointerView<"TROpenTypeFeature"> | undefined;
  /** `TRUInteger TRFontFeaturesGetCount(TRFontFeaturesRef features)` */
  TRFontFeaturesGetCount(features: Handle<"TRFontFeatures">): number;
  /** `TRFontFeaturesRef TRFontFeaturesRetain(TRFontFeaturesRef features)` (the handle owns the reference) */
  TRFontFeaturesRetain(features: Handle<"TRFontFeatures">): Handle<"TRFontFeatures"> | undefined;
  /** `TRFontFileRef TRFontFileCreateFromPath(const char *path)` (the handle owns the reference) */
  TRFontFileCreateFromPath(path: string): Handle<"TRFontFile"> | undefined;
  /** `TRFontFileRef TRFontFileCreateFromMemory(const void *memory, TRUInteger size)` (the handle owns the reference) */
  TRFontFileCreateFromMemory(memory: ArrayBuffer | ArrayBufferView, size: number): Handle<"TRFontFile"> | undefined;
  /** `TRUInteger TRFontFileGetTypefaceCount(TRFontFileRef fontFile)` */
  TRFontFileGetTypefaceCount(fontFile: Handle<"TRFontFile">): number;
  /** `TRTypefaceRef TRFontFileGetTypeface(TRFontFileRef fontFile, TRUInteger index)` (the handle retains the reference) */
  TRFontFileGetTypeface(fontFile: Handle<"TRFontFile">, index: number): Handle<"TRTypeface"> | undefined;
  /** `TRFontFileRef TRFontFileRetain(TRFontFileRef fontFile)` (the handle owns the reference) */
  TRFontFileRetain(fontFile: Handle<"TRFontFile">): Handle<"TRFontFile"> | undefined;
  /** `TRFrameResolverRef TRFrameResolverCreate(void)` (the handle owns the reference) */
  TRFrameResolverCreate(): Handle<"TRFrameResolver"> | undefined;
  /** `TRTypesetterRef TRFrameResolverGetTypesetter(TRFrameResolverRef resolver)` (the handle retains the reference) */
  TRFrameResolverGetTypesetter(resolver: Handle<"TRFrameResolver">): Handle<"TRTypesetter"> | undefined;
  /** `void TRFrameResolverSetTypesetter(TRFrameResolverRef resolver, TRTypesetterRef typesetter)` */
  TRFrameResolverSetTypesetter(resolver: Handle<"TRFrameResolver">, typesetter: Handle<"TRTypesetter"> | undefined): void;
  /** `TRSize TRFrameResolverGetFrameSize(TRFrameResolverRef resolver)` */
  TRFrameResolverGetFrameSize(resolver: Handle<"TRFrameResolver">): TRSize;
  /** `void TRFrameResolverSetFrameSize(TRFrameResolverRef resolver, TRSize size)` */
  TRFrameResolverSetFrameSize(resolver: Handle<"TRFrameResolver">, size: TRSize): void;
  /** `TRBoolean TRFrameResolverGetFitsHorizontally(TRFrameResolverRef resolver)` */
  TRFrameResolverGetFitsHorizontally(resolver: Handle<"TRFrameResolver">): boolean;
  /** `void TRFrameResolverSetFitsHorizontally(TRFrameResolverRef resolver, TRBoolean fits)` */
  TRFrameResolverSetFitsHorizontally(resolver: Handle<"TRFrameResolver">, fits: boolean): void;
  /** `TRBoolean TRFrameResolverGetFitsVertically(TRFrameResolverRef resolver)` */
  TRFrameResolverGetFitsVertically(resolver: Handle<"TRFrameResolver">): boolean;
  /** `void TRFrameResolverSetFitsVertically(TRFrameResolverRef resolver, TRBoolean fits)` */
  TRFrameResolverSetFitsVertically(resolver: Handle<"TRFrameResolver">, fits: boolean): void;
  /** `TRTextAlignment TRFrameResolverGetTextAlignment(TRFrameResolverRef resolver)` */
  TRFrameResolverGetTextAlignment(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetTextAlignment(TRFrameResolverRef resolver, TRTextAlignment alignment)` */
  TRFrameResolverSetTextAlignment(resolver: Handle<"TRFrameResolver">, alignment: number): void;
  /** `TRVerticalAlignment TRFrameResolverGetVerticalAlignment(TRFrameResolverRef resolver)` */
  TRFrameResolverGetVerticalAlignment(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetVerticalAlignment(TRFrameResolverRef resolver, TRVerticalAlignment alignment)` */
  TRFrameResolverSetVerticalAlignment(resolver: Handle<"TRFrameResolver">, alignment: number): void;
  /** `TRBreakMode TRFrameResolverGetTruncationMode(TRFrameResolverRef resolver)` */
  TRFrameResolverGetTruncationMode(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetTruncationMode(TRFrameResolverRef resolver, TRBreakMode mode)` */
  TRFrameResolverSetTruncationMode(resolver: Handle<"TRFrameResolver">, mode: number): void;
  /** `TRTruncationPlace TRFrameResolverGetTruncationPlace(TRFrameResolverRef resolver)` */
  TRFrameResolverGetTruncationPlace(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetTruncationPlace(TRFrameResolverRef resolver, TRTruncationPlace place)` */
  TRFrameResolverSetTruncationPlace(resolver: Handle<"TRFrameResolver">, place: number): void;
  /** `TRBoolean TRFrameResolverIsTruncationEnabled(TRFrameResolverRef resolver)` */
  TRFrameResolverIsTruncationEnabled(resolver: Handle<"TRFrameResolver">): boolean;
  /** `void TRFrameResolverSetTruncationEnabled(TRFrameResolverRef resolver, TRBoolean isEnabled)` */
  TRFrameResolverSetTruncationEnabled(resolver: Handle<"TRFrameResolver">, isEnabled: boolean): void;
  /** `TRBoolean TRFrameResolverIsJustificationEnabled(TRFrameResolverRef resolver)` */
  TRFrameResolverIsJustificationEnabled(resolver: Handle<"TRFrameResolver">): boolean;
  /** `void TRFrameResolverSetJustificationEnabled(TRFrameResolverRef resolver, TRBoolean isEnabled)` */
  TRFrameResolverSetJustificationEnabled(resolver: Handle<"TRFrameResolver">, isEnabled: boolean): void;
  /** `TRFloat TRFrameResolverGetJustificationLevel(TRFrameResolverRef resolver)` */
  TRFrameResolverGetJustificationLevel(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetJustificationLevel(TRFrameResolverRef resolver, TRFloat level)` */
  TRFrameResolverSetJustificationLevel(resolver: Handle<"TRFrameResolver">, level: number): void;
  /** `TRUInteger TRFrameResolverGetMaxLines(TRFrameResolverRef resolver)` */
  TRFrameResolverGetMaxLines(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetMaxLines(TRFrameResolverRef resolver, TRUInteger maxLines)` */
  TRFrameResolverSetMaxLines(resolver: Handle<"TRFrameResolver">, maxLines: number): void;
  /** `TRFloat TRFrameResolverGetExtraLineSpacing(TRFrameResolverRef resolver)` */
  TRFrameResolverGetExtraLineSpacing(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetExtraLineSpacing(TRFrameResolverRef resolver, TRFloat spacing)` */
  TRFrameResolverSetExtraLineSpacing(resolver: Handle<"TRFrameResolver">, spacing: number): void;
  /** `TRFloat TRFrameResolverGetLineHeightMultiplier(TRFrameResolverRef resolver)` */
  TRFrameResolverGetLineHeightMultiplier(resolver: Handle<"TRFrameResolver">): number;
  /** `void TRFrameResolverSetLineHeightMultiplier(TRFrameResolverRef resolver, TRFloat multiplier)` */
  TRFrameResolverSetLineHeightMultiplier(resolver: Handle<"TRFrameResolver">, multiplier: number): void;
  /** `TRComposedFrameRef TRFrameResolverCreateFrame(TRFrameResolverRef resolver, TRUInteger index, TRUInteger length)` (the handle owns the reference) */
  TRFrameResolverCreateFrame(resolver: Handle<"TRFrameResolver">, index: number, length: number): Handle<"TRComposedFrame"> | undefined;
  /** `TRFrameResolverRef TRFrameResolverRetain(TRFrameResolverRef resolver)` (the handle owns the reference) */
  TRFrameResolverRetain(resolver: Handle<"TRFrameResolver">): Handle<"TRFrameResolver"> | undefined;
  /** `TRGlyphCacheRef TRGlyphCacheCreate(TRUInteger capacity)` (the handle owns the reference) */
  TRGlyphCacheCreate(capacity: number): Handle<"TRGlyphCache"> | undefined;
  /** `TRGlyphCacheRef TRGlyphCacheGetDefault(void)` (the handle retains the reference) */
  TRGlyphCacheGetDefault(): Handle<"TRGlyphCache"> | undefined;
  /** `TRUInteger TRGlyphCacheGetCapacity(TRGlyphCacheRef cache)` */
  TRGlyphCacheGetCapacity(cache: Handle<"TRGlyphCache">): number;
  /** `void TRGlyphCacheSetCapacity(TRGlyphCacheRef cache, TRUInteger capacity)` */
  TRGlyphCacheSetCapacity(cache: Handle<"TRGlyphCache">, capacity: number): void;
  /** `TRUInteger TRGlyphCacheGetSize(TRGlyphCacheRef cache)` */
  TRGlyphCacheGetSize(cache: Handle<"TRGlyphCache">): number;
  /** `void TRGlyphCacheClear(TRGlyphCacheRef cache)` */
  TRGlyphCacheClear(cache: Handle<"TRGlyphCache">): void;
  /** `TRGlyphCacheRef TRGlyphCacheRetain(TRGlyphCacheRef cache)` (the handle owns the reference) */
  TRGlyphCacheRetain(cache: Handle<"TRGlyphCache">): Handle<"TRGlyphCache"> | undefined;
  /** `TRGlyphImageFormat TRGlyphImageGetFormat(TRGlyphImageRef image)` */
  TRGlyphImageGetFormat(image: Handle<"TRGlyphImage">): number;
  /** `TRInt32 TRGlyphImageGetLeft(TRGlyphImageRef image)` */
  TRGlyphImageGetLeft(image: Handle<"TRGlyphImage">): number;
  /** `TRInt32 TRGlyphImageGetTop(TRGlyphImageRef image)` */
  TRGlyphImageGetTop(image: Handle<"TRGlyphImage">): number;
  /** `TRUInt32 TRGlyphImageGetWidth(TRGlyphImageRef image)` */
  TRGlyphImageGetWidth(image: Handle<"TRGlyphImage">): number;
  /** `TRUInt32 TRGlyphImageGetHeight(TRGlyphImageRef image)` */
  TRGlyphImageGetHeight(image: Handle<"TRGlyphImage">): number;
  /** `const TRUInt8 *TRGlyphImageGetPixelsPtr(TRGlyphImageRef image)` */
  TRGlyphImageGetPixelsPtr(image: Handle<"TRGlyphImage">): PointerView<"TRUInt8"> | undefined;
  /** `TRUInteger TRGlyphImageGetByteCount(TRGlyphImageRef image)` */
  TRGlyphImageGetByteCount(image: Handle<"TRGlyphImage">): number;
  /** `TRGlyphImageRef TRGlyphImageRetain(TRGlyphImageRef image)` (the handle owns the reference) */
  TRGlyphImageRetain(image: Handle<"TRGlyphImage">): Handle<"TRGlyphImage"> | undefined;
  /** `TRUInteger TRGlyphRunGetStartIndex(TRGlyphRunRef run)` */
  TRGlyphRunGetStartIndex(run: Handle<"TRGlyphRun">): number;
  /** `TRUInteger TRGlyphRunGetEndIndex(TRGlyphRunRef run)` */
  TRGlyphRunGetEndIndex(run: Handle<"TRGlyphRun">): number;
  /** `TRUInteger TRGlyphRunGetStartExtraLength(TRGlyphRunRef run)` */
  TRGlyphRunGetStartExtraLength(run: Handle<"TRGlyphRun">): number;
  /** `TRUInteger TRGlyphRunGetEndExtraLength(TRGlyphRunRef run)` */
  TRGlyphRunGetEndExtraLength(run: Handle<"TRGlyphRun">): number;
  /** `TRUInt8 TRGlyphRunGetBidiLevel(TRGlyphRunRef run)` */
  TRGlyphRunGetBidiLevel(run: Handle<"TRGlyphRun">): number;
  /** `TRWritingDirection TRGlyphRunGetWritingDirection(TRGlyphRunRef run)` */
  TRGlyphRunGetWritingDirection(run: Handle<"TRGlyphRun">): number;
  /** `TRBoolean TRGlyphRunIsBackward(TRGlyphRunRef run)` */
  TRGlyphRunIsBackward(run: Handle<"TRGlyphRun">): boolean;
  /** `TRTypefaceRef TRGlyphRunGetTypeface(TRGlyphRunRef run)` (the handle retains the reference) */
  TRGlyphRunGetTypeface(run: Handle<"TRGlyphRun">): Handle<"TRTypeface"> | undefined;
  /** `TRFloat TRGlyphRunGetTypeSize(TRGlyphRunRef run)` */
  TRGlyphRunGetTypeSize(run: Handle<"TRGlyphRun">): number;
  /** `TRFloat TRGlyphRunGetScaleX(TRGlyphRunRef run)` */
  TRGlyphRunGetScaleX(run: Handle<"TRGlyphRun">): number;
  /** `TRFloat TRGlyphRunGetScaleY(TRGlyphRunRef run)` */
  TRGlyphRunGetScaleY(run: Handle<"TRGlyphRun">): number;
  /** `TRReplacementRef TRGlyphRunGetReplacement(TRGlyphRunRef run)` (the handle retains the reference) */
  TRGlyphRunGetReplacement(run: Handle<"TRGlyphRun">): Handle<"TRReplacement"> | undefined;
  /** `TRBoolean TRGlyphRunGetForegroundColor(TRGlyphRunRef run, TRColor *foregroundColor)` (`undefined` when it returns `TRFalse`) */
  TRGlyphRunGetForegroundColor(run: Handle<"TRGlyphRun">): number | undefined;
  /** `TRBoolean TRGlyphRunGetBackgroundColor(TRGlyphRunRef run, TRColor *backgroundColor)` (`undefined` when it returns `TRFalse`) */
  TRGlyphRunGetBackgroundColor(run: Handle<"TRGlyphRun">): number | undefined;
  /** `TRBoolean TRGlyphRunHasUnderline(TRGlyphRunRef run)` */
  TRGlyphRunHasUnderline(run: Handle<"TRGlyphRun">): boolean;
  /** `TRBoolean TRGlyphRunHasStrikethrough(TRGlyphRunRef run)` */
  TRGlyphRunHasStrikethrough(run: Handle<"TRGlyphRun">): boolean;
  /** `TRBoolean TRGlyphRunGetDecorationColor(TRGlyphRunRef run, TRColor *decorationColor)` (`undefined` when it returns `TRFalse`) */
  TRGlyphRunGetDecorationColor(run: Handle<"TRGlyphRun">): number | undefined;
  /** `const void *TRGlyphRunGetUserData(TRGlyphRunRef run)` */
  TRGlyphRunGetUserData(run: Handle<"TRGlyphRun">): number;
  /** `TRFloat TRGlyphRunGetAscent(TRGlyphRunRef run)` */
  TRGlyphRunGetAscent(run: Handle<"TRGlyphRun">): number;
  /** `TRFloat TRGlyphRunGetDescent(TRGlyphRunRef run)` */
  TRGlyphRunGetDescent(run: Handle<"TRGlyphRun">): number;
  /** `TRFloat TRGlyphRunGetLeading(TRGlyphRunRef run)` */
  TRGlyphRunGetLeading(run: Handle<"TRGlyphRun">): number;
  /** `TRPoint TRGlyphRunGetOrigin(TRGlyphRunRef run)` */
  TRGlyphRunGetOrigin(run: Handle<"TRGlyphRun">): TRPoint;
  /** `TRFloat TRGlyphRunGetWidth(TRGlyphRunRef run)` */
  TRGlyphRunGetWidth(run: Handle<"TRGlyphRun">): number;
  /** `TRFloat TRGlyphRunGetHeight(TRGlyphRunRef run)` */
  TRGlyphRunGetHeight(run: Handle<"TRGlyphRun">): number;
  /** `TRUInteger TRGlyphRunGetGlyphCount(TRGlyphRunRef run)` */
  TRGlyphRunGetGlyphCount(run: Handle<"TRGlyphRun">): number;
  /** `const TRGlyphID *TRGlyphRunGetGlyphIDsPtr(TRGlyphRunRef run)` */
  TRGlyphRunGetGlyphIDsPtr(run: Handle<"TRGlyphRun">): PointerView<"TRGlyphID"> | undefined;
  /** `const TRPoint *TRGlyphRunGetGlyphOffsetsPtr(TRGlyphRunRef run)` */
  TRGlyphRunGetGlyphOffsetsPtr(run: Handle<"TRGlyphRun">): PointerView<"TRPoint"> | undefined;
  /** `const TRFloat *TRGlyphRunGetGlyphAdvancesPtr(TRGlyphRunRef run)` */
  TRGlyphRunGetGlyphAdvancesPtr(run: Handle<"TRGlyphRun">): PointerView<"TRFloat"> | undefined;
  /** `const TRUInteger *TRGlyphRunGetClusterMapPtr(TRGlyphRunRef run)` */
  TRGlyphRunGetClusterMapPtr(run: Handle<"TRGlyphRun">): PointerView<"TRUInteger"> | undefined;
  /** `TRUInteger TRGlyphRunGetClusterMapCount(TRGlyphRunRef run)` */
  TRGlyphRunGetClusterMapCount(run: Handle<"TRGlyphRun">): number;
  /** `TRUInteger TRGlyphRunGetClusterStart(TRGlyphRunRef run, TRUInteger codeUnitIndex)` */
  TRGlyphRunGetClusterStart(run: Handle<"TRGlyphRun">, codeUnitIndex: number): number;
  /** `TRUInteger TRGlyphRunGetClusterEnd(TRGlyphRunRef run, TRUInteger codeUnitIndex)` */
  TRGlyphRunGetClusterEnd(run: Handle<"TRGlyphRun">, codeUnitIndex: number): number;
  /** `TRBoolean TRGlyphRunGetCodeUnitDistance(TRGlyphRunRef run, TRUInteger codeUnitIndex, TRFloat *distance)` (`undefined` when it returns `TRFalse`) */
  TRGlyphRunGetCodeUnitDistance(run: Handle<"TRGlyphRun">, codeUnitIndex: number): number | undefined;
  /** `TRUInteger TRGlyphRunGetCodeUnitIndexAtDistance(TRGlyphRunRef run, TRFloat distance)` */
  TRGlyphRunGetCodeUnitIndexAtDistance(run: Handle<"TRGlyphRun">, distance: number): number;
  /** `TRRect TRGlyphRunComputeInkBox(TRGlyphRunRef run, TRRendererRef renderer)` */
  TRGlyphRunComputeInkBox(run: Handle<"TRGlyphRun">, renderer: Handle<"TRRenderer"> | undefined): TRRect;
  /** `void TRGlyphRunDraw(TRGlyphRunRef run, TRRendererRef renderer, TRPoint origin)` */
  TRGlyphRunDraw(run: Handle<"TRGlyphRun">, renderer: Handle<"TRRenderer"> | undefined, origin: TRPoint): void;
  /** `TRGlyphRunRef TRGlyphRunRetain(TRGlyphRunRef run)` (the handle owns the reference) */
  TRGlyphRunRetain(run: Handle<"TRGlyphRun">): Handle<"TRGlyphRun"> | undefined;
  /** `TRLineLocatorRef TRLineLocatorCreate(TRComposedFrameRef frame, TRRendererRef renderer)` (the handle owns the reference) */
  TRLineLocatorCreate(frame: Handle<"TRComposedFrame">, renderer: Handle<"TRRenderer">): Handle<"TRLineLocator"> | undefined;
  /** `TRUInteger TRLineLocatorGetLineCount(TRLineLocatorRef locator)` */
  TRLineLocatorGetLineCount(locator: Handle<"TRLineLocator">): number;
  /** `TRBoolean TRLineLocatorGetLineBox(TRLineLocatorRef locator, TRUInteger lineIndex, TRRect *box)` (`undefined` when it returns `TRFalse`) */
  TRLineLocatorGetLineBox(locator: Handle<"TRLineLocator">, lineIndex: number): TRRect | undefined;
  /** `TRBoolean TRLineLocatorEnumerateLines(TRLineLocatorRef locator, TRRect rect, TRLineLocatorFunc func, void *userData)` (`undefined` when it returns `TRFalse`) */
  TRLineLocatorEnumerateLines(locator: Handle<"TRLineLocator">, rect: TRRect): number[] | undefined;
  /** `TRUInteger TRLineLocatorGetFirstLineIndexBelow(TRLineLocatorRef locator, TRFloat y)` */
  TRLineLocatorGetFirstLineIndexBelow(locator: Handle<"TRLineLocator">, y: number): number;
  /** `TRLineLocatorRef TRLineLocatorRetain(TRLineLocatorRef locator)` (the handle owns the reference) */
  TRLineLocatorRetain(locator: Handle<"TRLineLocator">): Handle<"TRLineLocator"> | undefined;
  /** `TRBoolean TRPathEnumerate(TRPathRef path, const TRAffineTransform *transform, const TRPathCallbacks *callbacks, void *userData)` (`undefined` when it returns `TRFalse`) */
  TRPathEnumerate(path: Handle<"TRPath">, transform: TRAffineTransform | undefined): ({ type: "moveTo"; x: number; y: number } | { type: "lineTo"; x: number; y: number } | { type: "quadTo"; controlX: number; controlY: number; x: number; y: number } | { type: "cubicTo"; control1X: number; control1Y: number; control2X: number; control2Y: number; x: number; y: number } | { type: "close" })[] | undefined;
  /** `TRPathRef TRPathRetain(TRPathRef path)` (the handle owns the reference) */
  TRPathRetain(path: Handle<"TRPath">): Handle<"TRPath"> | undefined;
  /** `TRRendererRef TRRendererCreate(void)` (the handle owns the reference) */
  TRRendererCreate(): Handle<"TRRenderer"> | undefined;
  /** `TRGlyphCacheRef TRRendererGetGlyphCache(TRRendererRef renderer)` (the handle retains the reference) */
  TRRendererGetGlyphCache(renderer: Handle<"TRRenderer">): Handle<"TRGlyphCache"> | undefined;
  /** `void TRRendererSetGlyphCache(TRRendererRef renderer, TRGlyphCacheRef cache)` */
  TRRendererSetGlyphCache(renderer: Handle<"TRRenderer">, cache: Handle<"TRGlyphCache"> | undefined): void;
  /** `TRTypefaceRef TRRendererGetTypeface(TRRendererRef renderer)` (the handle retains the reference) */
  TRRendererGetTypeface(renderer: Handle<"TRRenderer">): Handle<"TRTypeface"> | undefined;
  /** `void TRRendererSetTypeface(TRRendererRef renderer, TRTypefaceRef typeface)` */
  TRRendererSetTypeface(renderer: Handle<"TRRenderer">, typeface: Handle<"TRTypeface"> | undefined): void;
  /** `TRFloat TRRendererGetTypeSize(TRRendererRef renderer)` */
  TRRendererGetTypeSize(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetTypeSize(TRRendererRef renderer, TRFloat typeSize)` */
  TRRendererSetTypeSize(renderer: Handle<"TRRenderer">, typeSize: number): void;
  /** `TRFloat TRRendererGetScaleX(TRRendererRef renderer)` */
  TRRendererGetScaleX(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetScaleX(TRRendererRef renderer, TRFloat scaleX)` */
  TRRendererSetScaleX(renderer: Handle<"TRRenderer">, scaleX: number): void;
  /** `TRFloat TRRendererGetScaleY(TRRendererRef renderer)` */
  TRRendererGetScaleY(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetScaleY(TRRendererRef renderer, TRFloat scaleY)` */
  TRRendererSetScaleY(renderer: Handle<"TRRenderer">, scaleY: number): void;
  /** `TRFloat TRRendererGetSkewX(TRRendererRef renderer)` */
  TRRendererGetSkewX(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetSkewX(TRRendererRef renderer, TRFloat skewX)` */
  TRRendererSetSkewX(renderer: Handle<"TRRenderer">, skewX: number): void;
  /** `TRFloat TRRendererGetRenderScale(TRRendererRef renderer)` */
  TRRendererGetRenderScale(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetRenderScale(TRRendererRef renderer, TRFloat renderScale)` */
  TRRendererSetRenderScale(renderer: Handle<"TRRenderer">, renderScale: number): void;
  /** `TRWritingDirection TRRendererGetWritingDirection(TRRendererRef renderer)` */
  TRRendererGetWritingDirection(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetWritingDirection(TRRendererRef renderer, TRWritingDirection writingDirection)` */
  TRRendererSetWritingDirection(renderer: Handle<"TRRenderer">, writingDirection: number): void;
  /** `TRColor TRRendererGetForegroundColor(TRRendererRef renderer)` */
  TRRendererGetForegroundColor(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetForegroundColor(TRRendererRef renderer, TRColor foregroundColor)` */
  TRRendererSetForegroundColor(renderer: Handle<"TRRenderer">, foregroundColor: number): void;
  /** `TRFloat TRRendererGetStrokeRadius(TRRendererRef renderer)` */
  TRRendererGetStrokeRadius(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetStrokeRadius(TRRendererRef renderer, TRFloat strokeRadius)` */
  TRRendererSetStrokeRadius(renderer: Handle<"TRRenderer">, strokeRadius: number): void;
  /** `TRStrokeCap TRRendererGetStrokeCap(TRRendererRef renderer)` */
  TRRendererGetStrokeCap(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetStrokeCap(TRRendererRef renderer, TRStrokeCap strokeCap)` */
  TRRendererSetStrokeCap(renderer: Handle<"TRRenderer">, strokeCap: number): void;
  /** `TRStrokeJoin TRRendererGetStrokeJoin(TRRendererRef renderer)` */
  TRRendererGetStrokeJoin(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetStrokeJoin(TRRendererRef renderer, TRStrokeJoin strokeJoin)` */
  TRRendererSetStrokeJoin(renderer: Handle<"TRRenderer">, strokeJoin: number): void;
  /** `TRFloat TRRendererGetStrokeMiter(TRRendererRef renderer)` */
  TRRendererGetStrokeMiter(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetStrokeMiter(TRRendererRef renderer, TRFloat strokeMiter)` */
  TRRendererSetStrokeMiter(renderer: Handle<"TRRenderer">, strokeMiter: number): void;
  /** `TRColor TRRendererGetStrokeColor(TRRendererRef renderer)` */
  TRRendererGetStrokeColor(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetStrokeColor(TRRendererRef renderer, TRColor strokeColor)` */
  TRRendererSetStrokeColor(renderer: Handle<"TRRenderer">, strokeColor: number): void;
  /** `TRFloat TRRendererGetShadowRadius(TRRendererRef renderer)` */
  TRRendererGetShadowRadius(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetShadowRadius(TRRendererRef renderer, TRFloat shadowRadius)` */
  TRRendererSetShadowRadius(renderer: Handle<"TRRenderer">, shadowRadius: number): void;
  /** `TRFloat TRRendererGetShadowDx(TRRendererRef renderer)` */
  TRRendererGetShadowDx(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetShadowDx(TRRendererRef renderer, TRFloat shadowDx)` */
  TRRendererSetShadowDx(renderer: Handle<"TRRenderer">, shadowDx: number): void;
  /** `TRFloat TRRendererGetShadowDy(TRRendererRef renderer)` */
  TRRendererGetShadowDy(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetShadowDy(TRRendererRef renderer, TRFloat shadowDy)` */
  TRRendererSetShadowDy(renderer: Handle<"TRRenderer">, shadowDy: number): void;
  /** `TRColor TRRendererGetShadowColor(TRRendererRef renderer)` */
  TRRendererGetShadowColor(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetShadowColor(TRRendererRef renderer, TRColor shadowColor)` */
  TRRendererSetShadowColor(renderer: Handle<"TRRenderer">, shadowColor: number): void;
  /** `TRDrawStyle TRRendererGetDrawStyle(TRRendererRef renderer)` */
  TRRendererGetDrawStyle(renderer: Handle<"TRRenderer">): number;
  /** `void TRRendererSetDrawStyle(TRRendererRef renderer, TRDrawStyle drawStyle)` */
  TRRendererSetDrawStyle(renderer: Handle<"TRRenderer">, drawStyle: number): void;
  /** `TRBoolean TRRendererIsRenderable(TRRendererRef renderer)` */
  TRRendererIsRenderable(renderer: Handle<"TRRenderer">): boolean;
  /** `TRGlyphImageRef TRRendererCreateGlyphImage(TRRendererRef renderer, TRGlyphID glyphID)` (the handle owns the reference) */
  TRRendererCreateGlyphImage(renderer: Handle<"TRRenderer">, glyphID: number): Handle<"TRGlyphImage"> | undefined;
  /** `TRGlyphImageRef TRRendererCreateStrokeImage(TRRendererRef renderer, TRGlyphID glyphID)` (the handle owns the reference) */
  TRRendererCreateStrokeImage(renderer: Handle<"TRRenderer">, glyphID: number): Handle<"TRGlyphImage"> | undefined;
  /** `TRPathRef TRRendererCreateGlyphPath(TRRendererRef renderer, TRGlyphID glyphID)` (the handle owns the reference) */
  TRRendererCreateGlyphPath(renderer: Handle<"TRRenderer">, glyphID: number): Handle<"TRPath"> | undefined;
  /** `TRRect TRRendererComputeGlyphInkBox(TRRendererRef renderer, TRGlyphID glyphID)` */
  TRRendererComputeGlyphInkBox(renderer: Handle<"TRRenderer">, glyphID: number): TRRect;
  /** `TRRect TRRendererComputeRunInkBox(TRRendererRef renderer, const TRGlyphID *glyphIDs, const TRPoint *offsets, const TRFloat *advances, TRUInteger count)` */
  TRRendererComputeRunInkBox(renderer: Handle<"TRRenderer">, glyphIDs: ArrayBuffer | ArrayBufferView, offsets: readonly TRPoint[], advances: ArrayBuffer | ArrayBufferView, count: number): TRRect;
  /** `void TRRendererEnumerateGlyphPlacements(TRRendererRef renderer, TRGlyphImageKind kind, const TRGlyphID *glyphIDs, const TRPoint *offsets, const TRFloat *advances, TRUInteger count, TRGlyphPlacementFunc func, void *userData)` */
  TRRendererEnumerateGlyphPlacements(renderer: Handle<"TRRenderer">, kind: number, glyphIDs: ArrayBuffer | ArrayBufferView, offsets: readonly TRPoint[], advances: ArrayBuffer | ArrayBufferView, count: number): { glyphIndex: number; image: Handle<"TRGlyphImage">; origin: TRPoint; scaleX: number; scaleY: number }[];
  /** `void TRRendererEnumerateGlyphPaths(TRRendererRef renderer, const TRGlyphID *glyphIDs, const TRPoint *offsets, const TRFloat *advances, TRUInteger count, const TRPathCallbacks *callbacks, void *userData)` */
  TRRendererEnumerateGlyphPaths(renderer: Handle<"TRRenderer">, glyphIDs: ArrayBuffer | ArrayBufferView, offsets: readonly TRPoint[], advances: ArrayBuffer | ArrayBufferView, count: number): ({ type: "moveTo"; x: number; y: number } | { type: "lineTo"; x: number; y: number } | { type: "quadTo"; controlX: number; controlY: number; x: number; y: number } | { type: "cubicTo"; control1X: number; control1Y: number; control2X: number; control2Y: number; x: number; y: number } | { type: "close" })[];
  /** `TRRendererRef TRRendererRetain(TRRendererRef renderer)` (the handle owns the reference) */
  TRRendererRetain(renderer: Handle<"TRRenderer">): Handle<"TRRenderer"> | undefined;
  /** `TRReplacementKind TRReplacementGetKind(TRReplacementRef replacement)` */
  TRReplacementGetKind(replacement: Handle<"TRReplacement">): number;
  /** `void TRReplacementComputeRoom(TRReplacementRef replacement, TRFloat layoutWidth, TRReplacementRoom *room)` */
  TRReplacementComputeRoom(replacement: Handle<"TRReplacement">, layoutWidth: number): TRReplacementRoom;
  /** `TRReplacementRef TRReplacementRetain(TRReplacementRef replacement)` (the handle owns the reference) */
  TRReplacementRetain(replacement: Handle<"TRReplacement">): Handle<"TRReplacement"> | undefined;
  /** `TRWritingDirection TRShapingEngineGetScriptDefaultDirection(TRTag scriptTag)` */
  TRShapingEngineGetScriptDefaultDirection(scriptTag: number): number;
  /** `TRTag TRShapingEngineGetLanguageTagForName(const char *languageName)` */
  TRShapingEngineGetLanguageTagForName(languageName: string): number;
  /** `TRShapingEngineRef TRShapingEngineCreate(void)` (the handle owns the reference) */
  TRShapingEngineCreate(): Handle<"TRShapingEngine"> | undefined;
  /** `void TRShapingEngineSetTypeface(TRShapingEngineRef engine, TRTypefaceRef typeface)` */
  TRShapingEngineSetTypeface(engine: Handle<"TRShapingEngine">, typeface: Handle<"TRTypeface"> | undefined): void;
  /** `TRTypefaceRef TRShapingEngineGetTypeface(TRShapingEngineRef engine)` (the handle retains the reference) */
  TRShapingEngineGetTypeface(engine: Handle<"TRShapingEngine">): Handle<"TRTypeface"> | undefined;
  /** `void TRShapingEngineSetTypeSize(TRShapingEngineRef engine, TRFloat typeSize)` */
  TRShapingEngineSetTypeSize(engine: Handle<"TRShapingEngine">, typeSize: number): void;
  /** `TRFloat TRShapingEngineGetTypeSize(TRShapingEngineRef engine)` */
  TRShapingEngineGetTypeSize(engine: Handle<"TRShapingEngine">): number;
  /** `void TRShapingEngineSetScriptTag(TRShapingEngineRef engine, TRTag scriptTag)` */
  TRShapingEngineSetScriptTag(engine: Handle<"TRShapingEngine">, scriptTag: number): void;
  /** `TRTag TRShapingEngineGetScriptTag(TRShapingEngineRef engine)` */
  TRShapingEngineGetScriptTag(engine: Handle<"TRShapingEngine">): number;
  /** `void TRShapingEngineSetLanguageTag(TRShapingEngineRef engine, TRTag languageTag)` */
  TRShapingEngineSetLanguageTag(engine: Handle<"TRShapingEngine">, languageTag: number): void;
  /** `TRTag TRShapingEngineGetLanguageTag(TRShapingEngineRef engine)` */
  TRShapingEngineGetLanguageTag(engine: Handle<"TRShapingEngine">): number;
  /** `void TRShapingEngineSetWritingDirection(TRShapingEngineRef engine, TRWritingDirection writingDirection)` */
  TRShapingEngineSetWritingDirection(engine: Handle<"TRShapingEngine">, writingDirection: number): void;
  /** `TRWritingDirection TRShapingEngineGetWritingDirection(TRShapingEngineRef engine)` */
  TRShapingEngineGetWritingDirection(engine: Handle<"TRShapingEngine">): number;
  /** `void TRShapingEngineSetShapingOrder(TRShapingEngineRef engine, TRShapingOrder shapingOrder)` */
  TRShapingEngineSetShapingOrder(engine: Handle<"TRShapingEngine">, shapingOrder: number): void;
  /** `TRShapingOrder TRShapingEngineGetShapingOrder(TRShapingEngineRef engine)` */
  TRShapingEngineGetShapingOrder(engine: Handle<"TRShapingEngine">): number;
  /** `TRBoolean TRShapingEngineSetOpenTypeFeatures(TRShapingEngineRef engine, const TROpenTypeFeature *features, TRUInteger count)` */
  TRShapingEngineSetOpenTypeFeatures(engine: Handle<"TRShapingEngine">, features: readonly TROpenTypeFeature[] | undefined, count: number): boolean;
  /** `const TROpenTypeFeature *TRShapingEngineGetOpenTypeFeaturesPtr(TRShapingEngineRef engine)` */
  TRShapingEngineGetOpenTypeFeaturesPtr(engine: Handle<"TRShapingEngine">): PointerView<"TROpenTypeFeature"> | undefined;
  /** `TRUInteger TRShapingEngineGetOpenTypeFeatureCount(TRShapingEngineRef engine)` */
  TRShapingEngineGetOpenTypeFeatureCount(engine: Handle<"TRShapingEngine">): number;
  /** `TRShapingResultRef TRShapingEngineCreateShapingResult(TRShapingEngineRef engine, const void *codeUnits, TRUInteger length, TRStringEncoding encoding)` (the handle owns the reference) */
  TRShapingEngineCreateShapingResult(engine: Handle<"TRShapingEngine">, codeUnits: ArrayBuffer | ArrayBufferView | undefined, length: number, encoding: number): Handle<"TRShapingResult"> | undefined;
  /** `TRShapingEngineRef TRShapingEngineRetain(TRShapingEngineRef engine)` (the handle owns the reference) */
  TRShapingEngineRetain(engine: Handle<"TRShapingEngine">): Handle<"TRShapingEngine"> | undefined;
  /** `TRUInteger TRShapingResultGetCodeUnitCount(TRShapingResultRef result)` */
  TRShapingResultGetCodeUnitCount(result: Handle<"TRShapingResult">): number;
  /** `TRBoolean TRShapingResultIsBackward(TRShapingResultRef result)` */
  TRShapingResultIsBackward(result: Handle<"TRShapingResult">): boolean;
  /** `TRBoolean TRShapingResultIsRTL(TRShapingResultRef result)` */
  TRShapingResultIsRTL(result: Handle<"TRShapingResult">): boolean;
  /** `TRUInteger TRShapingResultGetGlyphCount(TRShapingResultRef result)` */
  TRShapingResultGetGlyphCount(result: Handle<"TRShapingResult">): number;
  /** `const TRGlyphID *TRShapingResultGetGlyphIDsPtr(TRShapingResultRef result)` */
  TRShapingResultGetGlyphIDsPtr(result: Handle<"TRShapingResult">): PointerView<"TRGlyphID"> | undefined;
  /** `const TRPoint *TRShapingResultGetGlyphOffsetsPtr(TRShapingResultRef result)` */
  TRShapingResultGetGlyphOffsetsPtr(result: Handle<"TRShapingResult">): PointerView<"TRPoint"> | undefined;
  /** `const TRFloat *TRShapingResultGetGlyphAdvancesPtr(TRShapingResultRef result)` */
  TRShapingResultGetGlyphAdvancesPtr(result: Handle<"TRShapingResult">): PointerView<"TRFloat"> | undefined;
  /** `const TRUInteger *TRShapingResultGetClusterMapPtr(TRShapingResultRef result)` */
  TRShapingResultGetClusterMapPtr(result: Handle<"TRShapingResult">): PointerView<"TRUInteger"> | undefined;
  /** `void TRShapingResultGetCaretEdges(TRShapingResultRef result, const TRBoolean *caretStops, TRFloat *caretEdges)` */
  TRShapingResultGetCaretEdges(result: Handle<"TRShapingResult">, caretStops: ArrayBuffer | ArrayBufferView | undefined, caretEdges: ArrayBuffer | ArrayBufferView): void;
  /** `TRShapingResultRef TRShapingResultRetain(TRShapingResultRef result)` (the handle owns the reference) */
  TRShapingResultRetain(result: Handle<"TRShapingResult">): Handle<"TRShapingResult"> | undefined;
  /** `TRTextRef TRTextCreate(const void *string, TRUInteger length, TRStringEncoding encoding)` (the handle owns the reference) */
  TRTextCreate(string: ArrayBuffer | ArrayBufferView | undefined, length: number, encoding: number): Handle<"TRText"> | undefined;
  /** `TRTextRef TRTextCreateCopy(TRTextRef text)` (the handle owns the reference) */
  TRTextCreateCopy(text: Handle<"TRText">): Handle<"TRText"> | undefined;
  /** `TRMutableTextRef TRTextCreateMutableCopy(TRTextRef text)` (the handle owns the reference) */
  TRTextCreateMutableCopy(text: Handle<"TRText">): Handle<"TRText"> | undefined;
  /** `TRStringEncoding TRTextGetEncoding(TRTextRef text)` */
  TRTextGetEncoding(text: Handle<"TRText">): number;
  /** `TRUInteger TRTextGetLength(TRTextRef text)` */
  TRTextGetLength(text: Handle<"TRText">): number;
  /** `TRBoolean TRTextGetCodeUnits(TRTextRef text, TRUInteger index, TRUInteger length, void *buffer)` */
  TRTextGetCodeUnits(text: Handle<"TRText">, index: number, length: number, buffer: ArrayBuffer | ArrayBufferView | undefined): boolean;
  /** `TRAttributeListRef TRTextCopyAttributes(TRTextRef text, TRUInteger index, TRUInteger *outLength)` (the handle owns the reference) */
  TRTextCopyAttributes(text: Handle<"TRText">, index: number): { result: Handle<"TRAttributeList"> | undefined; outLength: number };
  /** `TRTextRef TRTextRetain(TRTextRef text)` (the handle owns the reference) */
  TRTextRetain(text: Handle<"TRText">): Handle<"TRText"> | undefined;
  /** `TRMutableTextRef TRTextCreateMutable(TRStringEncoding encoding)` (the handle owns the reference) */
  TRTextCreateMutable(encoding: number): Handle<"TRText"> | undefined;
  /** `void TRTextBeginEditing(TRMutableTextRef text)` */
  TRTextBeginEditing(text: Handle<"TRText">): void;
  /** `void TRTextEndEditing(TRMutableTextRef text)` */
  TRTextEndEditing(text: Handle<"TRText">): void;
  /** `TRBoolean TRTextAppendCodeUnits(TRMutableTextRef text, const void *codeUnitBuffer, TRUInteger codeUnitCount)` */
  TRTextAppendCodeUnits(text: Handle<"TRText">, codeUnitBuffer: ArrayBuffer | ArrayBufferView | undefined, codeUnitCount: number): boolean;
  /** `TRBoolean TRTextInsertCodeUnits(TRMutableTextRef text, TRUInteger index, const void *codeUnitBuffer, TRUInteger codeUnitCount)` */
  TRTextInsertCodeUnits(text: Handle<"TRText">, index: number, codeUnitBuffer: ArrayBuffer | ArrayBufferView | undefined, codeUnitCount: number): boolean;
  /** `TRBoolean TRTextDeleteCodeUnits(TRMutableTextRef text, TRUInteger index, TRUInteger length)` */
  TRTextDeleteCodeUnits(text: Handle<"TRText">, index: number, length: number): boolean;
  /** `TRBoolean TRTextSetCodeUnits(TRMutableTextRef text, const void *codeUnitBuffer, TRUInteger codeUnitCount)` */
  TRTextSetCodeUnits(text: Handle<"TRText">, codeUnitBuffer: ArrayBuffer | ArrayBufferView | undefined, codeUnitCount: number): boolean;
  /** `TRBoolean TRTextReplaceCodeUnits(TRMutableTextRef text, TRUInteger index, TRUInteger length, const void *codeUnitBuffer, TRUInteger codeUnitCount)` */
  TRTextReplaceCodeUnits(text: Handle<"TRText">, index: number, length: number, codeUnitBuffer: ArrayBuffer | ArrayBufferView | undefined, codeUnitCount: number): boolean;
  /** `TRBoolean TRTextRemoveAttribute(TRMutableTextRef text, TRUInteger index, TRUInteger length, TRAttributeType attributeType)` */
  TRTextRemoveAttribute(text: Handle<"TRText">, index: number, length: number, attributeType: number): boolean;
  /** `TRWeight TRTypefaceGetWeight(TRTypefaceRef typeface)` */
  TRTypefaceGetWeight(typeface: Handle<"TRTypeface">): number;
  /** `TRWidth TRTypefaceGetWidth(TRTypefaceRef typeface)` */
  TRTypefaceGetWidth(typeface: Handle<"TRTypeface">): number;
  /** `TRSlope TRTypefaceGetSlope(TRTypefaceRef typeface)` */
  TRTypefaceGetSlope(typeface: Handle<"TRTypeface">): number;
  /** `TRUInt32 TRTypefaceGetUnitsPerEM(TRTypefaceRef typeface)` */
  TRTypefaceGetUnitsPerEM(typeface: Handle<"TRTypeface">): number;
  /** `TRInt32 TRTypefaceGetAscent(TRTypefaceRef typeface)` */
  TRTypefaceGetAscent(typeface: Handle<"TRTypeface">): number;
  /** `TRInt32 TRTypefaceGetDescent(TRTypefaceRef typeface)` */
  TRTypefaceGetDescent(typeface: Handle<"TRTypeface">): number;
  /** `TRInt32 TRTypefaceGetLeading(TRTypefaceRef typeface)` */
  TRTypefaceGetLeading(typeface: Handle<"TRTypeface">): number;
  /** `TRUInteger TRTypefaceGetGlyphCount(TRTypefaceRef typeface)` */
  TRTypefaceGetGlyphCount(typeface: Handle<"TRTypeface">): number;
  /** `TRBoolean TRTypefaceIsVariable(TRTypefaceRef typeface)` */
  TRTypefaceIsVariable(typeface: Handle<"TRTypeface">): boolean;
  /** `const TRVariationAxis *TRTypefaceGetVariationAxesPtr(TRTypefaceRef typeface)` */
  TRTypefaceGetVariationAxesPtr(typeface: Handle<"TRTypeface">): PointerView<"TRVariationAxis"> | undefined;
  /** `TRUInteger TRTypefaceGetVariationAxisCount(TRTypefaceRef typeface)` */
  TRTypefaceGetVariationAxisCount(typeface: Handle<"TRTypeface">): number;
  /** `const TRNamedStyle *TRTypefaceGetNamedStylesPtr(TRTypefaceRef typeface)` */
  TRTypefaceGetNamedStylesPtr(typeface: Handle<"TRTypeface">): PointerView<"TRNamedStyle"> | undefined;
  /** `TRUInteger TRTypefaceGetNamedStyleCount(TRTypefaceRef typeface)` */
  TRTypefaceGetNamedStyleCount(typeface: Handle<"TRTypeface">): number;
  /** `const TRPaletteEntry *TRTypefaceGetPaletteEntriesPtr(TRTypefaceRef typeface)` */
  TRTypefaceGetPaletteEntriesPtr(typeface: Handle<"TRTypeface">): PointerView<"TRPaletteEntry"> | undefined;
  /** `TRUInteger TRTypefaceGetPaletteEntryCount(TRTypefaceRef typeface)` */
  TRTypefaceGetPaletteEntryCount(typeface: Handle<"TRTypeface">): number;
  /** `const TRPredefinedPalette *TRTypefaceGetPredefinedPalettesPtr(TRTypefaceRef typeface)` */
  TRTypefaceGetPredefinedPalettesPtr(typeface: Handle<"TRTypeface">): PointerView<"TRPredefinedPalette"> | undefined;
  /** `TRUInteger TRTypefaceGetPredefinedPaletteCount(TRTypefaceRef typeface)` */
  TRTypefaceGetPredefinedPaletteCount(typeface: Handle<"TRTypeface">): number;
  /** `TRBoolean TRTypefaceIsScalable(TRTypefaceRef typeface)` */
  TRTypefaceIsScalable(typeface: Handle<"TRTypeface">): boolean;
  /** `const TRBitmapStrike *TRTypefaceGetBitmapStrikesPtr(TRTypefaceRef typeface)` */
  TRTypefaceGetBitmapStrikesPtr(typeface: Handle<"TRTypeface">): PointerView<"TRBitmapStrike"> | undefined;
  /** `TRUInteger TRTypefaceGetBitmapStrikeCount(TRTypefaceRef typeface)` */
  TRTypefaceGetBitmapStrikeCount(typeface: Handle<"TRTypeface">): number;
  /** `const TRFloat *TRTypefaceGetVariationCoordinatesPtr(TRTypefaceRef typeface)` */
  TRTypefaceGetVariationCoordinatesPtr(typeface: Handle<"TRTypeface">): PointerView<"TRFloat"> | undefined;
  /** `const TRColor *TRTypefaceGetAssociatedColorsPtr(TRTypefaceRef typeface)` */
  TRTypefaceGetAssociatedColorsPtr(typeface: Handle<"TRTypeface">): PointerView<"TRColor"> | undefined;
  /** `TRTypefaceRef TRTypefaceCreateWithVariation(TRTypefaceRef typeface, const TRFloat *coordinates, TRUInteger count)` (the handle owns the reference) */
  TRTypefaceCreateWithVariation(typeface: Handle<"TRTypeface">, coordinates: ArrayBuffer | ArrayBufferView | undefined, count: number): Handle<"TRTypeface"> | undefined;
  /** `TRTypefaceRef TRTypefaceCreateWithColors(TRTypefaceRef typeface, const TRColor *colors, TRUInteger count)` (the handle owns the reference) */
  TRTypefaceCreateWithColors(typeface: Handle<"TRTypeface">, colors: ArrayBuffer | ArrayBufferView | undefined, count: number): Handle<"TRTypeface"> | undefined;
  /** `const TRStringView *TRTypefaceGetFamilyName(TRTypefaceRef typeface)` */
  TRTypefaceGetFamilyName(typeface: Handle<"TRTypeface">): string | undefined;
  /** `const TRStringView *TRTypefaceGetStyleName(TRTypefaceRef typeface)` */
  TRTypefaceGetStyleName(typeface: Handle<"TRTypeface">): string | undefined;
  /** `const TRStringView *TRTypefaceGetFullName(TRTypefaceRef typeface)` */
  TRTypefaceGetFullName(typeface: Handle<"TRTypeface">): string | undefined;
  /** `TRRect TRTypefaceGetBoundingBox(TRTypefaceRef typeface)` */
  TRTypefaceGetBoundingBox(typeface: Handle<"TRTypeface">): TRRect;
  /** `TRInt32 TRTypefaceGetUnderlinePosition(TRTypefaceRef typeface)` */
  TRTypefaceGetUnderlinePosition(typeface: Handle<"TRTypeface">): number;
  /** `TRInt32 TRTypefaceGetUnderlineThickness(TRTypefaceRef typeface)` */
  TRTypefaceGetUnderlineThickness(typeface: Handle<"TRTypeface">): number;
  /** `TRInt32 TRTypefaceGetStrikeoutPosition(TRTypefaceRef typeface)` */
  TRTypefaceGetStrikeoutPosition(typeface: Handle<"TRTypeface">): number;
  /** `TRInt32 TRTypefaceGetStrikeoutThickness(TRTypefaceRef typeface)` */
  TRTypefaceGetStrikeoutThickness(typeface: Handle<"TRTypeface">): number;
  /** `TRGlyphID TRTypefaceGetGlyphID(TRTypefaceRef typeface, TRUInt32 codePoint)` */
  TRTypefaceGetGlyphID(typeface: Handle<"TRTypeface">, codePoint: number): number;
  /** `TRGlyphID TRTypefaceGetVariantGlyphID(TRTypefaceRef typeface, TRUInt32 codePoint, TRUInt32 variantSelector)` */
  TRTypefaceGetVariantGlyphID(typeface: Handle<"TRTypeface">, codePoint: number, variantSelector: number): number;
  /** `TRFloat TRTypefaceGetGlyphAdvance(TRTypefaceRef typeface, TRGlyphID glyphID, TRFloat typeSize, TRBoolean isVertical)` */
  TRTypefaceGetGlyphAdvance(typeface: Handle<"TRTypeface">, glyphID: number, typeSize: number, isVertical: boolean): number;
  /** `TRPathRef TRTypefaceCreateGlyphPath(TRTypefaceRef typeface, TRGlyphID glyphID, TRFloat typeSize)` (the handle owns the reference) */
  TRTypefaceCreateGlyphPath(typeface: Handle<"TRTypeface">, glyphID: number, typeSize: number): Handle<"TRPath"> | undefined;
  /** `TRUInteger TRTypefaceGetTableSize(TRTypefaceRef typeface, TRTag tag)` */
  TRTypefaceGetTableSize(typeface: Handle<"TRTypeface">, tag: number): number;
  /** `TRUInteger TRTypefaceGetTableData(TRTypefaceRef typeface, TRTag tag, TRUInteger offset, void *buffer, TRUInteger capacity)` */
  TRTypefaceGetTableData(typeface: Handle<"TRTypeface">, tag: number, offset: number, buffer: ArrayBuffer | ArrayBufferView | undefined, capacity: number): number;
  /** `TRUInteger TRTypefaceGetGlyphName(TRTypefaceRef typeface, TRGlyphID glyphID, char *buffer, TRUInteger capacity)` */
  TRTypefaceGetGlyphName(typeface: Handle<"TRTypeface">, glyphID: number, buffer: ArrayBuffer | ArrayBufferView | undefined, capacity: number): number;
  /** `TRTypefaceRef TRTypefaceRetain(TRTypefaceRef typeface)` (the handle owns the reference) */
  TRTypefaceRetain(typeface: Handle<"TRTypeface">): Handle<"TRTypeface"> | undefined;
  /** `TRBoolean TRTypefaceManagerRegisterTypeface(TRTypefaceRef typeface, TRUInteger tag, TRUInteger familyID)` */
  TRTypefaceManagerRegisterTypeface(typeface: Handle<"TRTypeface">, tag: number, familyID: number): boolean;
  /** `TRBoolean TRTypefaceManagerUnregisterTypeface(TRTypefaceRef typeface)` */
  TRTypefaceManagerUnregisterTypeface(typeface: Handle<"TRTypeface">): boolean;
  /** `TRTypefaceRef TRTypefaceManagerGetTypeface(TRUInteger tag)` (the handle retains the reference) */
  TRTypefaceManagerGetTypeface(tag: number): Handle<"TRTypeface"> | undefined;
  /** `TRUInteger TRTypefaceManagerGetTypefaceTag(TRTypefaceRef typeface)` */
  TRTypefaceManagerGetTypefaceTag(typeface: Handle<"TRTypeface">): number;
  /** `TRUInteger TRTypefaceManagerGetTypefaceFamilyID(TRTypefaceRef typeface)` */
  TRTypefaceManagerGetTypefaceFamilyID(typeface: Handle<"TRTypeface">): number;
  /** `TRTypefaceRef TRTypefaceManagerGetMatchingTypefaceByFamilyID(TRUInteger familyID, TRWidth width, TRWeight weight, TRSlope slope)` (the handle retains the reference) */
  TRTypefaceManagerGetMatchingTypefaceByFamilyID(familyID: number, width: number, weight: number, slope: number): Handle<"TRTypeface"> | undefined;
  /** `TRTypefaceRef TRTypefaceManagerGetMatchingTypefaceByFamilyName( const TRStringView *familyName, TRWidth width, TRWeight weight, TRSlope slope)` (the handle retains the reference) */
  TRTypefaceManagerGetMatchingTypefaceByFamilyName(familyName: string, width: number, weight: number, slope: number): Handle<"TRTypeface"> | undefined;
  /** `void TRTypefaceManagerEnumerateTypefaces(TRTypefaceManagerTypefaceCallback callback, void *context)` */
  TRTypefaceManagerEnumerateTypefaces(): Handle<"TRTypeface">[];
  /** `void TRTypefaceManagerEnumerateFamilies(TRTypefaceManagerFamilyCallback callback, void *context)` */
  TRTypefaceManagerEnumerateFamilies(): { familyID: number; familyName: string }[];
  /** `TRUInteger TRTypesetterGetCodeUnitCount(TRTypesetterRef typesetter)` */
  TRTypesetterGetCodeUnitCount(typesetter: Handle<"TRTypesetter">): number;
  /** `TRUInteger TRTypesetterSuggestForwardBreak(TRTypesetterRef typesetter, TRUInteger index, TRUInteger length, TRFloat extent, TRBreakMode breakMode)` */
  TRTypesetterSuggestForwardBreak(typesetter: Handle<"TRTypesetter">, index: number, length: number, extent: number, breakMode: number): number;
  /** `TRUInteger TRTypesetterSuggestBackwardBreak(TRTypesetterRef typesetter, TRUInteger index, TRUInteger length, TRFloat extent, TRBreakMode breakMode)` */
  TRTypesetterSuggestBackwardBreak(typesetter: Handle<"TRTypesetter">, index: number, length: number, extent: number, breakMode: number): number;
  /** `TRComposedLineRef TRTypesetterCreateSimpleLine(TRTypesetterRef typesetter, TRUInteger index, TRUInteger length, TRFloat layoutWidth)` (the handle owns the reference) */
  TRTypesetterCreateSimpleLine(typesetter: Handle<"TRTypesetter">, index: number, length: number, layoutWidth: number): Handle<"TRComposedLine"> | undefined;
  /** `TRComposedLineRef TRTypesetterCreateTruncationToken(TRTypesetterRef typesetter, TRUInteger index, TRUInteger length, TRTruncationPlace truncationPlace, const void *tokenString, TRUInteger tokenLength, TRStringEncoding tokenEncoding)` (the handle owns the reference) */
  TRTypesetterCreateTruncationToken(typesetter: Handle<"TRTypesetter">, index: number, length: number, truncationPlace: number, tokenString: ArrayBuffer | ArrayBufferView | undefined, tokenLength: number, tokenEncoding: number): Handle<"TRComposedLine"> | undefined;
  /** `TRComposedLineRef TRTypesetterCreateTruncatedLine(TRTypesetterRef typesetter, TRUInteger index, TRUInteger length, TRFloat extent, TRBreakMode breakMode, TRTruncationPlace truncationPlace, TRComposedLineRef tokenLine)` (the handle owns the reference) */
  TRTypesetterCreateTruncatedLine(typesetter: Handle<"TRTypesetter">, index: number, length: number, extent: number, breakMode: number, truncationPlace: number, tokenLine: Handle<"TRComposedLine">): Handle<"TRComposedLine"> | undefined;
  /** `TRComposedLineRef TRTypesetterCreateJustifiedLine(TRTypesetterRef typesetter, TRUInteger index, TRUInteger length, TRFloat justificationFactor, TRFloat justificationExtent)` (the handle owns the reference) */
  TRTypesetterCreateJustifiedLine(typesetter: Handle<"TRTypesetter">, index: number, length: number, justificationFactor: number, justificationExtent: number): Handle<"TRComposedLine"> | undefined;
  /** `TRTypesetterRef TRTypesetterRetain(TRTypesetterRef typesetter)` (the handle owns the reference) */
  TRTypesetterRetain(typesetter: Handle<"TRTypesetter">): Handle<"TRTypesetter"> | undefined;
}
