# API parity audit

This is the audit of issue #23. It compares every public function of Tehreer Core (`Libraries/TehreerCore/Headers/Tehreer/TR*.h`) with the bound API (`cpp/generated`, `cpp/runtime`, `src/`), and the TypeScript API with Tehreer-Web, Tehreer-Android and Tehreer-Cocoa. `tests/apiParity.test.ts` fails when a public function of Core is missing from the tables below, so a Core bump cannot add a function silently.

Status words:

| Status | Meaning |
|--------|---------|
| bound | Generated binding; the TypeScript member is in the next column. |
| bound (constructor) | The `Create` function is the constructor of the class. |
| renamed | Bound, and the TypeScript name differs from the stem of the Core name beyond the usual `Get`/`Is`/`Set` prefixes. |
| bound (internal) | Bound and used by the wrapper, but not public API. |
| bound, unused | Bound in `NativeFunctions.ts` but no TypeScript calls it, with the reason. |
| manual | Not generated; bound by hand in `cpp/runtime` because the signature has C function pointers, a union or retained callbacks. |
| excluded | Not bound, with the reason. |

Counts: 320 public functions in 21 headers (`TRSheenBidi.h` has one, `TRTextGetSheenBidiText`). 18 `TR*Release` functions and 2 more are excluded (20); 8 are bound by hand; the other 292 are bound by the generator (the `TR*Retain` functions are internal). Every function has a row. Where several TypeScript members are named, the function serves each of them (a count function serves the list it sizes).

## Findings in short

- No public function of Core is missing without a reason. The exclusions are the `Release` functions (a handle releases its single reference), `TRVersionGetString` (declared, never defined) and `TRTextGetSheenBidiText` (needs SheenBidi's experimental text API).
- Native-only: the draw callbacks and user data of the renderer and the native data of a glyph image are used by the platform painters, not by JavaScript.
- Gaps against the siblings are listed in the last section. None is a Core function.

## Functions by header

### TRAttributeList.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRAttributeListGetItem` | bound | `TextAttributeCodec` |  |
| `TRAttributeListGetCount` | bound | `TextAttributeCodec` |  |
| `TRAttributeListRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRAttributeListRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRComposedFrame.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRComposedFrameGetStartIndex` | bound | `ComposedFrame.startIndex` |  |
| `TRComposedFrameGetEndIndex` | bound | `ComposedFrame.endIndex` |  |
| `TRComposedFrameGetWidth` | bound | `ComposedFrame.width` |  |
| `TRComposedFrameGetHeight` | bound | `ComposedFrame.height` |  |
| `TRComposedFrameGetLineCount` | bound | `ComposedFrame.lines` |  |
| `TRComposedFrameGetLine` | bound | `ComposedFrame.lines` |  |
| `TRComposedFrameGetLineIndexForCodeUnit` | bound | `ComposedFrame.getLineIndexForCodeUnit()` |  |
| `TRComposedFrameGetClusterStartAtPosition` | bound | `ComposedFrame.getClusterStartAtPosition()` | Not in Web, Android or Cocoa (searched `ClusterStartAt` in Tehreer-Web `src`, tehreerAndroid and tehreerCocoa: no match); `-1` for no character. |
| `TRComposedFrameGetLineIndexAtPosition` | bound | `ComposedFrame.getLineIndexAtPosition()` |  |
| `TRComposedFrameEnumerateSelection` | renamed | `ComposedFrame.getSelectionRects()` | Core enumerates through a callback; JavaScript gets the array. |
| `TRComposedFrameDraw` | bound | `ComposedFrame.draw()` |  |
| `TRComposedFrameRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRComposedFrameRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRComposedLine.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRComposedLineGetStartIndex` | bound | `ComposedLine.startIndex` |  |
| `TRComposedLineGetEndIndex` | bound | `ComposedLine.endIndex` |  |
| `TRComposedLineGetParagraphLevel` | bound | `ComposedLine.paragraphLevel` |  |
| `TRComposedLineGetOrigin` | bound | `ComposedLine.origin` |  |
| `TRComposedLineGetAscent` | bound | `ComposedLine.ascent` |  |
| `TRComposedLineGetDescent` | bound | `ComposedLine.descent` |  |
| `TRComposedLineGetLeading` | bound | `ComposedLine.leading` |  |
| `TRComposedLineGetWidth` | bound | `ComposedLine.width` |  |
| `TRComposedLineGetHeight` | bound | `ComposedLine.height` |  |
| `TRComposedLineGetTrailingWhitespaceExtent` | bound | `ComposedLine.trailingWhitespaceExtent` |  |
| `TRComposedLineIsBlock` | bound | `ComposedLine.isBlock` |  |
| `TRComposedLineIsTruncated` | bound | `ComposedLine.isTruncated` |  |
| `TRComposedLineGetGlyphRunCount` | bound | `ComposedLine.runs` |  |
| `TRComposedLineGetGlyphRun` | bound | `ComposedLine.runs` |  |
| `TRComposedLineGetCodeUnitDistance` | bound | `ComposedLine.getCodeUnitDistance()` |  |
| `TRComposedLineEnumerateVisualEdges` | bound | `ComposedLine.getVisualEdges()` | Core enumerates through a callback; JavaScript gets an array. |
| `TRComposedLineGetClusterStartAtDistance` | bound | `ComposedLine.getClusterStartAtDistance()` | Not in Web, Android or Cocoa (searched `ClusterStartAt` in Tehreer-Web `src`, tehreerAndroid and tehreerCocoa: no match); `-1` for no character. |
| `TRComposedLineGetCodeUnitIndexAtDistance` | bound | `ComposedLine.getCodeUnitIndexAtDistance()` |  |
| `TRComposedLineGetPenOffset` | bound | `ComposedLine.getPenOffset()` |  |
| `TRComposedLineComputeInkBox` | bound | `ComposedLine.computeInkBox()` |  |
| `TRComposedLineDraw` | bound | `ComposedLine.draw()` |  |
| `TRComposedLineRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRComposedLineRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRFontFeatures.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRFontFeaturesCreate` | bound (constructor) | `new FontFeatures(features)` |  |
| `TRFontFeaturesGetItemsPtr` | bound | `FontFeatures.items` |  |
| `TRFontFeaturesGetCount` | bound | `FontFeatures.count`, `FontFeatures.items` |  |
| `TRFontFeaturesRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRFontFeaturesRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRFontFile.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRFontFileCreateFromPath` | bound | `FontFile.fromPath()` |  |
| `TRFontFileCreateFromMemory` | renamed | `FontFile.fromBytes()`, `FontFile.fromAsset()` | `fromAsset` reads a bundled asset and then creates the file from its bytes. |
| `TRFontFileGetTypefaceCount` | bound | `FontFile.typefaces` |  |
| `TRFontFileGetTypeface` | bound | `FontFile.typefaces` |  |
| `TRFontFileRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRFontFileRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRFrameResolver.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRFrameResolverCreate` | bound (constructor) | `new FrameResolver(...)` |  |
| `TRFrameResolverGetTypesetter` | bound | `FrameResolver.typesetter`, `FrameResolver.createFrame()` |  |
| `TRFrameResolverSetTypesetter` | bound | `FrameResolver.typesetter` (setter) |  |
| `TRFrameResolverGetFrameSize` | bound | `FrameResolver.#getFrameSize()` |  |
| `TRFrameResolverSetFrameSize` | bound | `FrameResolver.#setFrameSize()` |  |
| `TRFrameResolverGetFitsHorizontally` | bound | `FrameResolver.fitsHorizontally` |  |
| `TRFrameResolverSetFitsHorizontally` | bound | `FrameResolver.fitsHorizontally` (setter) |  |
| `TRFrameResolverGetFitsVertically` | bound | `FrameResolver.fitsVertically` |  |
| `TRFrameResolverSetFitsVertically` | bound | `FrameResolver.fitsVertically` (setter) |  |
| `TRFrameResolverGetTextAlignment` | bound | `FrameResolver.textAlignment` |  |
| `TRFrameResolverSetTextAlignment` | bound | `FrameResolver.textAlignment` (setter) |  |
| `TRFrameResolverGetVerticalAlignment` | bound | `FrameResolver.verticalAlignment` |  |
| `TRFrameResolverSetVerticalAlignment` | bound | `FrameResolver.verticalAlignment` (setter) |  |
| `TRFrameResolverGetTruncationMode` | bound | `FrameResolver.truncationMode` |  |
| `TRFrameResolverSetTruncationMode` | bound | `FrameResolver.truncationMode` (setter) |  |
| `TRFrameResolverGetTruncationPlace` | bound | `FrameResolver.truncationPlace` |  |
| `TRFrameResolverSetTruncationPlace` | bound | `FrameResolver.truncationPlace` (setter) |  |
| `TRFrameResolverIsTruncationEnabled` | bound | `FrameResolver.isTruncationEnabled` |  |
| `TRFrameResolverSetTruncationEnabled` | bound | `FrameResolver.isTruncationEnabled` (setter) |  |
| `TRFrameResolverIsJustificationEnabled` | bound | `FrameResolver.isJustificationEnabled` |  |
| `TRFrameResolverSetJustificationEnabled` | bound | `FrameResolver.isJustificationEnabled` (setter) |  |
| `TRFrameResolverGetJustificationLevel` | bound | `FrameResolver.justificationLevel` |  |
| `TRFrameResolverSetJustificationLevel` | bound | `FrameResolver.justificationLevel` (setter) |  |
| `TRFrameResolverGetMaxLines` | bound | `FrameResolver.maxLines` |  |
| `TRFrameResolverSetMaxLines` | bound | `FrameResolver.maxLines` (setter) |  |
| `TRFrameResolverGetExtraLineSpacing` | bound | `FrameResolver.extraLineSpacing` |  |
| `TRFrameResolverSetExtraLineSpacing` | bound | `FrameResolver.extraLineSpacing` (setter) |  |
| `TRFrameResolverGetLineHeightMultiplier` | bound | `FrameResolver.lineHeightMultiplier` |  |
| `TRFrameResolverSetLineHeightMultiplier` | bound | `FrameResolver.lineHeightMultiplier` (setter) |  |
| `TRFrameResolverCreateFrame` | bound | `FrameResolver.createFrame()` |  |
| `TRFrameResolverRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRFrameResolverRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRGlyphCache.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRGlyphCacheCreate` | bound (constructor) | `new GlyphCache(...)` |  |
| `TRGlyphCacheGetDefault` | bound | `GlyphCache.default()` |  |
| `TRGlyphCacheGetCapacity` | bound | `GlyphCache.capacity` |  |
| `TRGlyphCacheSetCapacity` | bound | `GlyphCache.capacity` (setter) |  |
| `TRGlyphCacheGetSize` | bound | `GlyphCache.size` |  |
| `TRGlyphCacheClear` | bound | `GlyphCache.clear()` |  |
| `TRGlyphCacheRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRGlyphCacheRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRGlyphImage.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRGlyphImageGetFormat` | bound | `GlyphImage.format` |  |
| `TRGlyphImageGetLeft` | bound | `GlyphImage.left` |  |
| `TRGlyphImageGetTop` | bound | `GlyphImage.top` |  |
| `TRGlyphImageGetWidth` | bound | `GlyphImage.width` |  |
| `TRGlyphImageGetHeight` | bound | `GlyphImage.height` |  |
| `TRGlyphImageGetPixelsPtr` | bound | `GlyphImage.pixels` |  |
| `TRGlyphImageGetByteCount` | bound | `GlyphImage.byteCount`, `GlyphImage.pixels` |  |
| `TRGlyphImageGetNativeData` | manual | none (native) | Platform object that the painter attached to the image. |
| `TRGlyphImageSetNativeData` | manual | none (native) | Painters attach platform images; JavaScript has no use for them. |
| `TRGlyphImageRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRGlyphImageRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRGlyphRun.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRGlyphRunGetStartIndex` | bound | `GlyphRun.startIndex` |  |
| `TRGlyphRunGetEndIndex` | bound | `GlyphRun.endIndex` |  |
| `TRGlyphRunGetStartExtraLength` | bound | `GlyphRun.startExtraLength` |  |
| `TRGlyphRunGetEndExtraLength` | bound | `GlyphRun.endExtraLength` |  |
| `TRGlyphRunGetBidiLevel` | bound | `GlyphRun.bidiLevel` |  |
| `TRGlyphRunGetWritingDirection` | bound | `GlyphRun.writingDirection` |  |
| `TRGlyphRunIsBackward` | bound | `GlyphRun.isBackward` |  |
| `TRGlyphRunGetTypeface` | bound | `GlyphRun.typeface` |  |
| `TRGlyphRunGetTypeSize` | bound | `GlyphRun.typeSize` |  |
| `TRGlyphRunGetScaleX` | bound | `GlyphRun.scaleX` |  |
| `TRGlyphRunGetScaleY` | bound | `GlyphRun.scaleY` |  |
| `TRGlyphRunGetReplacement` | bound | `GlyphRun.replacement` |  |
| `TRGlyphRunGetForegroundColor` | bound | `GlyphRun.foregroundColor` |  |
| `TRGlyphRunGetBackgroundColor` | bound | `GlyphRun.backgroundColor` |  |
| `TRGlyphRunHasUnderline` | bound | `GlyphRun.hasUnderline` |  |
| `TRGlyphRunHasStrikethrough` | bound | `GlyphRun.hasStrikethrough` |  |
| `TRGlyphRunGetDecorationColor` | bound | `GlyphRun.decorationColor` |  |
| `TRGlyphRunGetUserData` | bound | `GlyphRun.userData` |  |
| `TRGlyphRunGetAscent` | bound | `GlyphRun.ascent` |  |
| `TRGlyphRunGetDescent` | bound | `GlyphRun.descent` |  |
| `TRGlyphRunGetLeading` | bound | `GlyphRun.leading` |  |
| `TRGlyphRunGetOrigin` | bound | `GlyphRun.origin` |  |
| `TRGlyphRunGetWidth` | bound | `GlyphRun.width` |  |
| `TRGlyphRunGetHeight` | bound | `GlyphRun.height` |  |
| `TRGlyphRunGetGlyphCount` | bound | `GlyphRun.glyphCount`, `GlyphRun.glyphIds`, `GlyphRun.glyphOffsets` |  |
| `TRGlyphRunGetGlyphIDsPtr` | bound | `GlyphRun.glyphIds` |  |
| `TRGlyphRunGetGlyphOffsetsPtr` | bound | `GlyphRun.glyphOffsets` |  |
| `TRGlyphRunGetGlyphAdvancesPtr` | bound | `GlyphRun.glyphAdvances` |  |
| `TRGlyphRunGetClusterMapPtr` | bound | `GlyphRun.clusterMap` |  |
| `TRGlyphRunGetClusterMapCount` | bound | `GlyphRun.clusterMap` |  |
| `TRGlyphRunGetClusterStart` | bound | `GlyphRun.getClusterStart()` |  |
| `TRGlyphRunGetClusterEnd` | bound | `GlyphRun.getClusterEnd()` |  |
| `TRGlyphRunGetCodeUnitDistance` | bound | `GlyphRun.getCodeUnitDistance()` |  |
| `TRGlyphRunGetCodeUnitIndexAtDistance` | bound | `GlyphRun.getCodeUnitIndexAtDistance()` |  |
| `TRGlyphRunComputeInkBox` | bound | `GlyphRun.computeInkBox()` |  |
| `TRGlyphRunDraw` | bound | `GlyphRun.draw()` |  |
| `TRGlyphRunRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRGlyphRunRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRLineLocator.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRLineLocatorCreate` | bound (constructor) | `new LineLocator(...)` |  |
| `TRLineLocatorGetLineCount` | bound | `LineLocator.lineCount` |  |
| `TRLineLocatorGetLineBox` | bound | `LineLocator.getLineBox()` |  |
| `TRLineLocatorEnumerateLines` | renamed | `LineLocator.findLines()` | Core enumerates through a callback; JavaScript gets an array. |
| `TRLineLocatorGetFirstLineIndexBelow` | bound | `LineLocator.getFirstLineIndexBelow()` |  |
| `TRLineLocatorRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRLineLocatorRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRPath.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRPathEnumerate` | bound (internal) | `Path` (filled by `Typeface.getGlyphPath()`, `Renderer.getGlyphPath()`) | `Path` is a plain TypeScript sink of verbs and coordinates, so the outline of Core is released at once. |
| `TRPathRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRPathRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRRenderer.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRRendererCreate` | bound (constructor) | `new Renderer(...)` |  |
| `TRRendererGetGlyphCache` | bound | `Renderer.glyphCache` |  |
| `TRRendererSetGlyphCache` | bound | `Renderer.glyphCache` (setter) |  |
| `TRRendererGetTypeface` | bound | `Renderer.typeface` |  |
| `TRRendererSetTypeface` | bound | `Renderer.typeface` (setter) |  |
| `TRRendererGetTypeSize` | bound | `Renderer.typeSize` |  |
| `TRRendererSetTypeSize` | bound | `Renderer.typeSize` (setter) |  |
| `TRRendererGetScaleX` | bound | `Renderer.scaleX` |  |
| `TRRendererSetScaleX` | bound | `Renderer.scaleX` (setter) |  |
| `TRRendererGetScaleY` | bound | `Renderer.scaleY` |  |
| `TRRendererSetScaleY` | bound | `Renderer.scaleY` (setter) |  |
| `TRRendererGetSkewX` | bound | `Renderer.skewX` |  |
| `TRRendererSetSkewX` | bound | `Renderer.skewX` (setter) |  |
| `TRRendererGetRenderScale` | bound | `Renderer.renderScale` |  |
| `TRRendererSetRenderScale` | bound | `Renderer.renderScale` (setter) |  |
| `TRRendererGetWritingDirection` | bound | `Renderer.writingDirection` |  |
| `TRRendererSetWritingDirection` | bound | `Renderer.writingDirection` (setter) |  |
| `TRRendererGetForegroundColor` | bound | `Renderer.foregroundColor` |  |
| `TRRendererSetForegroundColor` | bound | `Renderer.foregroundColor` (setter) |  |
| `TRRendererGetStrokeRadius` | bound | `Renderer.strokeRadius` |  |
| `TRRendererSetStrokeRadius` | bound | `Renderer.strokeRadius` (setter) |  |
| `TRRendererGetStrokeCap` | bound | `Renderer.strokeCap` |  |
| `TRRendererSetStrokeCap` | bound | `Renderer.strokeCap` (setter) |  |
| `TRRendererGetStrokeJoin` | bound | `Renderer.strokeJoin` |  |
| `TRRendererSetStrokeJoin` | bound | `Renderer.strokeJoin` (setter) |  |
| `TRRendererGetStrokeMiter` | bound | `Renderer.strokeMiter` |  |
| `TRRendererSetStrokeMiter` | bound | `Renderer.strokeMiter` (setter) |  |
| `TRRendererGetStrokeColor` | bound | `Renderer.strokeColor` |  |
| `TRRendererSetStrokeColor` | bound | `Renderer.strokeColor` (setter) |  |
| `TRRendererGetShadowRadius` | bound | `Renderer.shadowRadius` |  |
| `TRRendererSetShadowRadius` | bound | `Renderer.shadowRadius` (setter) |  |
| `TRRendererGetShadowDx` | bound | `Renderer.shadowDx` |  |
| `TRRendererSetShadowDx` | bound | `Renderer.shadowDx` (setter) |  |
| `TRRendererGetShadowDy` | bound | `Renderer.shadowDy` |  |
| `TRRendererSetShadowDy` | bound | `Renderer.shadowDy` (setter) |  |
| `TRRendererGetShadowColor` | bound | `Renderer.shadowColor` |  |
| `TRRendererSetShadowColor` | bound | `Renderer.shadowColor` (setter) |  |
| `TRRendererGetDrawStyle` | bound | `Renderer.drawStyle` |  |
| `TRRendererSetDrawStyle` | bound | `Renderer.drawStyle` (setter) |  |
| `TRRendererGetDrawCallbacks` | manual | none (native) | C function pointers; only the native painter uses them. |
| `TRRendererGetDrawUserData` | manual | none (native) | Opaque pointer of the native painter. |
| `TRRendererSetDrawCallbacks` | manual | none (native) | The painters of iOS and Android set them; `ComposedFrame.draw`, `ComposedLine.draw` and `GlyphRun.draw` take a `DrawingContext` instead. |
| `TRRendererIsRenderable` | bound | `Renderer.isRenderable` |  |
| `TRRendererCreateGlyphImage` | bound | `Renderer.getGlyphImage()` |  |
| `TRRendererCreateStrokeImage` | bound | `Renderer.getStrokeImage()` |  |
| `TRRendererCreateGlyphPath` | bound | `Renderer.getGlyphPath()` |  |
| `TRRendererComputeGlyphInkBox` | bound | `Renderer.computeGlyphInkBox()` |  |
| `TRRendererComputeRunInkBox` | bound | `Renderer.computeRunInkBox()` |  |
| `TRRendererEnumerateGlyphPlacements` | bound | `Renderer.getGlyphPlacements()` |  |
| `TRRendererEnumerateGlyphPaths` | renamed | `Renderer.generatePath()` | Collects the outlines of a run into one `Path`. |
| `TRRendererRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRRendererRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRReplacement.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRReplacementCreate` | manual | `new Replacement(delegate, kind)` | Callbacks stay in Core after the call, so they go through the handler table (`cpp/runtime/ReplacementBindings.cpp`). |
| `TRReplacementGetKind` | bound | `Replacement.kind` |  |
| `TRReplacementComputeRoom` | bound | `Replacement.computeRoom()` |  |
| `TRReplacementRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRReplacementRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRShapingEngine.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRShapingEngineGetScriptDefaultDirection` | bound | `ShapingEngine.getScriptDefaultDirection()` |  |
| `TRShapingEngineGetLanguageTagForName` | bound | `ShapingEngine.getLanguageTag()` |  |
| `TRShapingEngineCreate` | bound (constructor) | `new ShapingEngine(...)` |  |
| `TRShapingEngineSetTypeface` | bound | `ShapingEngine.typeface` (setter) |  |
| `TRShapingEngineGetTypeface` | bound, unused | `ShapingEngine.typeface` (getter) | The getter returns the `ShapingTypeface` that was set; Core cannot give back the wrapper object. |
| `TRShapingEngineSetTypeSize` | bound | `ShapingEngine.typeSize` (setter) |  |
| `TRShapingEngineGetTypeSize` | bound | `ShapingEngine.typeSize` |  |
| `TRShapingEngineSetScriptTag` | bound | `ShapingEngine.scriptTag` (setter) |  |
| `TRShapingEngineGetScriptTag` | bound | `ShapingEngine.scriptTag` |  |
| `TRShapingEngineSetLanguageTag` | bound | `ShapingEngine.languageTag` (setter) |  |
| `TRShapingEngineGetLanguageTag` | bound | `ShapingEngine.languageTag` |  |
| `TRShapingEngineSetWritingDirection` | bound | `ShapingEngine.writingDirection` (setter) |  |
| `TRShapingEngineGetWritingDirection` | bound | `ShapingEngine.writingDirection` |  |
| `TRShapingEngineSetShapingOrder` | bound | `ShapingEngine.shapingOrder` (setter) |  |
| `TRShapingEngineGetShapingOrder` | bound | `ShapingEngine.shapingOrder` |  |
| `TRShapingEngineSetOpenTypeFeatures` | bound | `ShapingEngine.openTypeFeatures` (setter) |  |
| `TRShapingEngineGetOpenTypeFeaturesPtr` | bound, unused | `ShapingEngine.openTypeFeatures` (getter) | The getter returns the copy that was set, for the same reason. |
| `TRShapingEngineGetOpenTypeFeatureCount` | bound, unused | `ShapingEngine.openTypeFeatures` (getter) | As above. |
| `TRShapingEngineCreateShapingResult` | renamed | `ShapingEngine.shapeText()` | Name of Web. |
| `TRShapingEngineRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRShapingEngineRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRShapingResult.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRShapingResultGetCodeUnitCount` | bound | `ShapingResult.codeUnitCount`, `ShapingResult.clusterMap`, `ShapingResult.getCaretEdges()` |  |
| `TRShapingResultIsBackward` | bound | `ShapingResult.isBackward` |  |
| `TRShapingResultIsRTL` | bound | `ShapingResult.isRTL` |  |
| `TRShapingResultGetGlyphCount` | bound | `ShapingResult.glyphCount`, `ShapingResult.glyphIds`, `ShapingResult.glyphOffsets` |  |
| `TRShapingResultGetGlyphIDsPtr` | bound | `ShapingResult.glyphIds` |  |
| `TRShapingResultGetGlyphOffsetsPtr` | bound | `ShapingResult.glyphOffsets` |  |
| `TRShapingResultGetGlyphAdvancesPtr` | bound | `ShapingResult.glyphAdvances` |  |
| `TRShapingResultGetClusterMapPtr` | bound | `ShapingResult.clusterMap` |  |
| `TRShapingResultGetCaretEdges` | bound | `ShapingResult.getCaretEdges()` |  |
| `TRShapingResultRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRShapingResultRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRSheenBidi.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRTextGetSheenBidiText` | excluded | none | Needs SheenBidi's experimental text API (`SB_CONFIG_EXPERIMENTAL_TEXT_API`), which the wrapper does not build. The bidi classes are bound by hand from the classic API instead. |

### TRText.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRTextCreate` | bound (constructor) | `new TText(...)` |  |
| `TRTextCreateCopy` | bound | `TText.copy()` |  |
| `TRTextCreateMutableCopy` | bound | `TText.mutableCopy()` |  |
| `TRTextGetEncoding` | bound, unused | none | The text of the wrapper is always UTF-16 (a JavaScript string), so the encoding is a constant (`TRStringEncodingUTF16`). |
| `TRTextGetLength` | bound | `TText.length` |  |
| `TRTextGetCodeUnits` | renamed | `TText.getString()` | UTF-16 code units are returned as a string. |
| `TRTextCopyAttributes` | renamed | `TText.getAttributeRun()` | Returns the attributes with the length they stay the same over. |
| `TRTextRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRTextRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |
| `TRTextCreateMutable` | bound (constructor) | `new TMutableText(...)` |  |
| `TRTextBeginEditing` | bound | `TMutableText.beginEditing()` |  |
| `TRTextEndEditing` | bound | `TMutableText.endEditing()` |  |
| `TRTextAppendCodeUnits` | bound | `TMutableText.append()` |  |
| `TRTextInsertCodeUnits` | bound | `TMutableText.insert()` |  |
| `TRTextDeleteCodeUnits` | bound | `TMutableText.delete()` |  |
| `TRTextSetCodeUnits` | renamed | `TMutableText.setString()` | Takes a string. |
| `TRTextReplaceCodeUnits` | bound | `TMutableText.replace()` |  |
| `TRTextSetAttribute` | manual | `TMutableText.setAttributes` | Takes the union `TRAttributeValue`, written by the attribute codec (`cpp/runtime/TextBindings.cpp`). |
| `TRTextRemoveAttribute` | bound | `TMutableText.removeAttributes()` |  |

### TRTypeface.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRTypefaceGetWeight` | bound | `Typeface.weight` |  |
| `TRTypefaceGetWidth` | bound | `Typeface.width` |  |
| `TRTypefaceGetSlope` | bound | `Typeface.slope` |  |
| `TRTypefaceGetUnitsPerEM` | renamed | `Typeface.unitsPerEm` | `EM` becomes `Em`, as in Web and Android. |
| `TRTypefaceGetAscent` | bound | `Typeface.ascent` |  |
| `TRTypefaceGetDescent` | bound | `Typeface.descent` |  |
| `TRTypefaceGetLeading` | bound | `Typeface.leading` |  |
| `TRTypefaceGetGlyphCount` | bound | `Typeface.glyphCount` |  |
| `TRTypefaceIsVariable` | bound | `Typeface.isVariable` |  |
| `TRTypefaceGetVariationAxesPtr` | bound | `Typeface.variationAxes` |  |
| `TRTypefaceGetVariationAxisCount` | bound | `Typeface.variationAxes`, `Typeface.variationCoordinates` | Gives the length of the list. |
| `TRTypefaceGetNamedStylesPtr` | bound | `Typeface.namedStyles` |  |
| `TRTypefaceGetNamedStyleCount` | bound | `Typeface.namedStyles` |  |
| `TRTypefaceGetPaletteEntriesPtr` | renamed | `Typeface.paletteEntryNames` | The list holds the names of the entries, as in Web. |
| `TRTypefaceGetPaletteEntryCount` | bound | `Typeface.paletteEntryNames`, `Typeface.associatedColors` |  |
| `TRTypefaceGetPredefinedPalettesPtr` | bound | `Typeface.predefinedPalettes` |  |
| `TRTypefaceGetPredefinedPaletteCount` | bound | `Typeface.predefinedPalettes` |  |
| `TRTypefaceIsScalable` | bound | `Typeface.isScalable` |  |
| `TRTypefaceGetBitmapStrikesPtr` | bound | `Typeface.bitmapStrikes` |  |
| `TRTypefaceGetBitmapStrikeCount` | bound | `Typeface.bitmapStrikes` |  |
| `TRTypefaceGetVariationCoordinatesPtr` | bound | `Typeface.variationCoordinates` |  |
| `TRTypefaceGetAssociatedColorsPtr` | bound | `Typeface.associatedColors` |  |
| `TRTypefaceCreateWithVariation` | renamed | `Typeface.getVariationInstance()` | Name of Web and Android; Cocoa has `variationInstance(forCoordinates:)`. |
| `TRTypefaceCreateWithColors` | renamed | `Typeface.getColorInstance()` | Name of Web and Android; Cocoa has `colorInstance(forColors:)`. |
| `TRTypefaceGetFamilyName` | bound | `Typeface.familyName` |  |
| `TRTypefaceGetStyleName` | bound | `Typeface.styleName` |  |
| `TRTypefaceGetFullName` | bound | `Typeface.styleName`, `Typeface.fullName` |  |
| `TRTypefaceGetBoundingBox` | bound | `Typeface.boundingBox` |  |
| `TRTypefaceGetUnderlinePosition` | bound | `Typeface.underlinePosition` |  |
| `TRTypefaceGetUnderlineThickness` | bound | `Typeface.underlineThickness` |  |
| `TRTypefaceGetStrikeoutPosition` | bound | `Typeface.strikeoutPosition` |  |
| `TRTypefaceGetStrikeoutThickness` | bound | `Typeface.strikeoutThickness` |  |
| `TRTypefaceGetGlyphID` | renamed | `Typeface.getGlyphId()` | `ID` becomes `Id`. |
| `TRTypefaceGetVariantGlyphID` | renamed | `Typeface.getVariantGlyphId()` | `ID` becomes `Id`. |
| `TRTypefaceGetGlyphAdvance` | bound | `Typeface.getGlyphAdvance()` |  |
| `TRTypefaceCreateGlyphPath` | bound | `Typeface.getGlyphPath()` |  |
| `TRTypefaceGetTableSize` | bound | `Typeface.getTableSize()`, `Typeface.getTableData()` |  |
| `TRTypefaceGetTableData` | bound | `Typeface.getTableData()` |  |
| `TRTypefaceGetGlyphName` | bound | `Typeface.getGlyphName()` |  |
| `TRTypefaceRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRTypefaceRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRTypefaceManager.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRTypefaceManagerRegisterTypeface` | bound | `TypefaceManager.registerTypeface()` |  |
| `TRTypefaceManagerUnregisterTypeface` | bound | `TypefaceManager.unregisterTypeface()` |  |
| `TRTypefaceManagerGetTypeface` | bound | `TypefaceManager.getTypeface()` |  |
| `TRTypefaceManagerGetTypefaceTag` | bound | `TypefaceManager.getTypefaceTag()` |  |
| `TRTypefaceManagerGetTypefaceFamilyID` | renamed | `TypefaceManager.getTypefaceFamilyId()` | `ID` becomes `Id`. |
| `TRTypefaceManagerGetMatchingTypefaceByFamilyID` | bound | `TypeFamily.getTypefaceByStyle()` |  |
| `TRTypefaceManagerGetMatchingTypefaceByFamilyName` | bound | `TypefaceManager.getTypefaceByStyle()` |  |
| `TRTypefaceManagerEnumerateTypefaces` | renamed | `TypefaceManager.getAvailableTypefaces()` | Core enumerates through a callback; JavaScript gets an array. |
| `TRTypefaceManagerEnumerateFamilies` | renamed | `TypefaceManager.getAvailableFamilies()` | Core enumerates through a callback; JavaScript gets an array. |

### TRTypesetter.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRTypesetterCreate` | manual | `new Typesetter(text, defaultAttributes)` | Takes an array of `TRAttribute`, written by the attribute codec (`cpp/runtime/TextBindings.cpp`). |
| `TRTypesetterGetCodeUnitCount` | bound | `Typesetter.codeUnitCount` |  |
| `TRTypesetterSuggestForwardBreak` | bound | `Typesetter.suggestForwardBreak()` |  |
| `TRTypesetterSuggestBackwardBreak` | bound | `Typesetter.suggestBackwardBreak()` |  |
| `TRTypesetterCreateSimpleLine` | bound | `Typesetter.createSimpleLine()` |  |
| `TRTypesetterCreateTruncationToken` | bound | `Typesetter.createTruncationToken()` |  |
| `TRTypesetterCreateTruncatedLine` | bound | `Typesetter.createTruncatedLine()` |  |
| `TRTypesetterCreateJustifiedLine` | bound | `Typesetter.createJustifiedLine()` |  |
| `TRTypesetterRetain` | bound (internal) | `Holding` (`holding()`) | Reached through `retainHandle`; the wrapper retains a handle while a call uses it. |
| `TRTypesetterRelease` | excluded | `dispose()` | A handle releases its one reference on `dispose()` or collection; a release from JavaScript would free it twice. |

### TRVersion.h

| Core function | Status | TypeScript | Notes |
|---|---|---|---|
| `TRVersionGetString` | excluded | `getVersion()` (renamed) | Declared but never defined in Core; the version comes from the `TEHREER_VERSION_STRING` macro (`cpp/runtime/TehreerBindings.cpp`). |


## SheenBidi

Core's `TRSheenBidi.h` is the only SheenBidi header in the table above. The classic SheenBidi API is bound by hand (`cpp/runtime/SheenBidiBindings.cpp`, typed in `src/internal/SheenBidiFunctions.ts`) behind `BidiAlgorithm`, `BidiParagraph`, `BidiLine`, `BidiRun`, `BidiPair`, `CodePoint`, `ScriptClassifier` and `ScriptRun`. `scripts/generator/sheenbidi.mjs` lists the functions not bound with the reason, and `tests/sheenbidi.test.ts` compares it with the headers when the dependencies are fetched.

## Renamed concepts against Web, Android and Cocoa

The TypeScript API follows Tehreer-Web name for name where the platform allows, and Android where Web has no counterpart.

| Concept | Core | Web | Android | Cocoa | This wrapper |
|---------|------|-----|---------|-------|--------------|
| Identifier suffix | `ID`, `EM` | `Id`, `Em` | `Id`, `Em` | `ID`, `Em` | `Id`, `Em` (same as Web) |
| Pooled objects | `Retain` / `Release` | `dispose()` | finalizer | `deinit` | `dispose()` or collection (same as Web) |
| Variation and color instance | `TRTypefaceCreateWithVariation`, `...WithColors` | `getVariationInstance`, `getColorInstance` | same | `variationInstance(forCoordinates:)`, `colorInstance(forColors:)` | same as Web |
| Enumerations with callbacks | `...Enumerate...` | arrays | arrays | arrays | arrays (`getSelectionRects`, `getVisualEdges`, `findLines`, `getAvailableTypefaces`, `getAvailableFamilies`) |
| Text content | code units, encoding | `TText.string`, `getString` | `TText` | `TText` | `TText.string`, `getString`; always UTF-16 |
| Attributes | `TRAttribute` | `TextAttributes` objects | spans (`TypefaceSpan`, `TypeSizeSpan`, ...) | `NSAttributedString` keys | `TextAttributes` objects (same as Web) |
| Inline objects | `TRReplacement` | `ReplacementDelegate`, `Replacement` | `ReplacementHolder`, `ViewSpan` | `TextReplacement` | `ReplacementDelegate`, `Replacement` (same as Web) |
| Drawing target | `TRDrawCallbacks` | `DrawingContext` (canvas, SVG) | `Canvas` | `CGContext` | `DrawingContext` implemented by `Canvas` and `CGContext` painters |
| Outline | `TRPath` | `Path` (`toPath2D`, `toSvgPathData`) | `Path` | `CGPath` | `Path` (`toSvgPathData`) |
| Number lists | pointer and count | `List`, `NumberList`, `PointList` | `IntList`, `FloatList`, `ByteList`, `PointList` | `CoreCollection` | `List`, `NumberList`, `PointList` (same as Web) |
| Font metadata | `TRTypeface` getters | `ColorPalette`, `NamedStyle`, `VariationAxis` in `graphics` | same in `font` | same in `Graphics` | in `graphics` (same as Web) |
| Mirroring pairs | SheenBidi | `BidiLine.mirroringPairs` | `BidiLine.mirroringPairs` | locator | `BidiLine.mirroringPairs` |
| Views | none | `TLabel`, `TTextView` (React DOM) | `TLabel`, `TTextView` (views) | SwiftUI views | `TLabel`, `TTextView` (React Native) on `TLinePaint` |
| Version | `TRVersionGetString` (undefined) | `getVersion()` | `Tehreer` constants | none | `getVersion()` |

## Gaps found

None of them is a Core function. Each is a decision for the owner, not a bug.

1. **`Renderer.drawGlyphs`, `drawWith`, `drawInto` (Web).** Web draws a bare glyph run through the renderer. Here a `GlyphBuffers` run is only measured (`computeRunInkBox`), placed (`getGlyphPlacements`) or turned into a path (`generatePath`); drawing needs a `ComposedLine`, `ComposedFrame` or `GlyphRun`. Not added: it needs a native entry that takes buffers, which is larger than an audit fix.
2. **`toSvg` on `ComposedFrame`, `ComposedLine`, `GlyphRun` (Web), `Path.toPath2D`, `GlyphImage.toRgba`, `FontFile.fromUrl`.** Web-only by nature (SVG output, `Path2D`, `Uint8ClampedArray` for canvas, `fetch`). `Path.toSvgPathData` exists. `FontFile.fromAsset` and `fromPath` replace `fromUrl`.
3. **`GlyphImage.adopting` / `retaining` (Web) and similar statics.** Here the constructor with the `adopt` token is `@internal`; no public equivalent is needed because JavaScript cannot hold a raw Core pointer.
4. **SFNT table readers (Android `sfnt/tables`: `head`, `hhea`, `maxp`, `name`, `OS/2`, `post`; Cocoa `SFNT/Tables`).** Neither Web nor this wrapper has them. `Typeface.getTableSize` and `getTableData` return the raw bytes, so an application can parse a table. Core has no table API.
5. **Four bound functions have no TypeScript caller, by design.** The three `bound, unused` rows (`TRShapingEngineGetTypeface`, `TRShapingEngineGetOpenTypeFeaturesPtr`, `TRShapingEngineGetOpenTypeFeatureCount`) and `TRTextGetEncoding` are deliberate: the getters of `ShapingEngine` return what was set because a Core handle cannot give back the wrapper object.
6. **TSDoc of generated enumerations.** The members of `BidiClass`, `GeneralCategory` and `Script` (`src/unicode/enums.ts`) have no per-member comment; the file is written by `scripts/generate-unicode-enums.mjs` and the constants carry their Unicode names. The declarations themselves are documented.
