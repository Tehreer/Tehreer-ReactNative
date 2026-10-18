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

#ifndef TEHREER_GENERATED_HANDLES_H
#define TEHREER_GENERATED_HANDLES_H

#include "GeneratedSupport.h"

namespace tehreer {
namespace marshal {

template <> struct HandleTraits<TRAttributeListRef> {
    static constexpr const char *kGroup = "TRAttributeList";
    static constexpr bool kMutable = false;
    static void Retain(TRAttributeListRef ref) { TRAttributeListRetain(ref); }
    static void Release(TRAttributeListRef ref) { TRAttributeListRelease(ref); }
};

template <> struct HandleTraits<TRComposedFrameRef> {
    static constexpr const char *kGroup = "TRComposedFrame";
    static constexpr bool kMutable = false;
    static void Retain(TRComposedFrameRef ref) { TRComposedFrameRetain(ref); }
    static void Release(TRComposedFrameRef ref) { TRComposedFrameRelease(ref); }
};

template <> struct HandleTraits<TRComposedLineRef> {
    static constexpr const char *kGroup = "TRComposedLine";
    static constexpr bool kMutable = false;
    static void Retain(TRComposedLineRef ref) { TRComposedLineRetain(ref); }
    static void Release(TRComposedLineRef ref) { TRComposedLineRelease(ref); }
};

template <> struct HandleTraits<TRFontFeaturesRef> {
    static constexpr const char *kGroup = "TRFontFeatures";
    static constexpr bool kMutable = false;
    static void Retain(TRFontFeaturesRef ref) { TRFontFeaturesRetain(ref); }
    static void Release(TRFontFeaturesRef ref) { TRFontFeaturesRelease(ref); }
};

template <> struct HandleTraits<TRFontFileRef> {
    static constexpr const char *kGroup = "TRFontFile";
    static constexpr bool kMutable = false;
    static void Retain(TRFontFileRef ref) { TRFontFileRetain(ref); }
    static void Release(TRFontFileRef ref) { TRFontFileRelease(ref); }
};

template <> struct HandleTraits<TRFrameResolverRef> {
    static constexpr const char *kGroup = "TRFrameResolver";
    static constexpr bool kMutable = true;
    static void Retain(TRFrameResolverRef ref) { TRFrameResolverRetain(ref); }
    static void Release(TRFrameResolverRef ref) { TRFrameResolverRelease(ref); }
};

template <> struct HandleTraits<TRGlyphCacheRef> {
    static constexpr const char *kGroup = "TRGlyphCache";
    static constexpr bool kMutable = true;
    static void Retain(TRGlyphCacheRef ref) { TRGlyphCacheRetain(ref); }
    static void Release(TRGlyphCacheRef ref) { TRGlyphCacheRelease(ref); }
};

template <> struct HandleTraits<TRGlyphImageRef> {
    static constexpr const char *kGroup = "TRGlyphImage";
    static constexpr bool kMutable = true;
    static void Retain(TRGlyphImageRef ref) { TRGlyphImageRetain(ref); }
    static void Release(TRGlyphImageRef ref) { TRGlyphImageRelease(ref); }
};

template <> struct HandleTraits<TRGlyphRunRef> {
    static constexpr const char *kGroup = "TRGlyphRun";
    static constexpr bool kMutable = false;
    static void Retain(TRGlyphRunRef ref) { TRGlyphRunRetain(ref); }
    static void Release(TRGlyphRunRef ref) { TRGlyphRunRelease(ref); }
};

template <> struct HandleTraits<TRLineLocatorRef> {
    static constexpr const char *kGroup = "TRLineLocator";
    static constexpr bool kMutable = false;
    static void Retain(TRLineLocatorRef ref) { TRLineLocatorRetain(ref); }
    static void Release(TRLineLocatorRef ref) { TRLineLocatorRelease(ref); }
};

template <> struct HandleTraits<TRPathRef> {
    static constexpr const char *kGroup = "TRPath";
    static constexpr bool kMutable = false;
    static void Retain(TRPathRef ref) { TRPathRetain(ref); }
    static void Release(TRPathRef ref) { TRPathRelease(ref); }
};

template <> struct HandleTraits<TRRendererRef> {
    static constexpr const char *kGroup = "TRRenderer";
    static constexpr bool kMutable = true;
    static void Retain(TRRendererRef ref) { TRRendererRetain(ref); }
    static void Release(TRRendererRef ref) { TRRendererRelease(ref); }
};

template <> struct HandleTraits<TRReplacementRef> {
    static constexpr const char *kGroup = "TRReplacement";
    static constexpr bool kMutable = false;
    static void Retain(TRReplacementRef ref) { TRReplacementRetain(ref); }
    static void Release(TRReplacementRef ref) { TRReplacementRelease(ref); }
};

template <> struct HandleTraits<TRShapingEngineRef> {
    static constexpr const char *kGroup = "TRShapingEngine";
    static constexpr bool kMutable = true;
    static void Retain(TRShapingEngineRef ref) { TRShapingEngineRetain(ref); }
    static void Release(TRShapingEngineRef ref) { TRShapingEngineRelease(ref); }
};

template <> struct HandleTraits<TRShapingResultRef> {
    static constexpr const char *kGroup = "TRShapingResult";
    static constexpr bool kMutable = false;
    static void Retain(TRShapingResultRef ref) { TRShapingResultRetain(ref); }
    static void Release(TRShapingResultRef ref) { TRShapingResultRelease(ref); }
};

template <> struct HandleTraits<TRTextRef> {
    static constexpr const char *kGroup = "TRText";
    static constexpr bool kMutable = false;
    static void Retain(TRTextRef ref) { TRTextRetain(ref); }
    static void Release(TRTextRef ref) { TRTextRelease(ref); }
};

template <> struct HandleTraits<TRMutableTextRef> {
    static constexpr const char *kGroup = "TRText";
    static constexpr bool kMutable = true;
    static void Retain(TRMutableTextRef ref) { TRTextRetain(ref); }
    static void Release(TRMutableTextRef ref) { TRTextRelease(ref); }
};

template <> struct HandleTraits<TRTypefaceRef> {
    static constexpr const char *kGroup = "TRTypeface";
    static constexpr bool kMutable = false;
    static void Retain(TRTypefaceRef ref) { TRTypefaceRetain(ref); }
    static void Release(TRTypefaceRef ref) { TRTypefaceRelease(ref); }
};

template <> struct HandleTraits<TRTypesetterRef> {
    static constexpr const char *kGroup = "TRTypesetter";
    static constexpr bool kMutable = false;
    static void Retain(TRTypesetterRef ref) { TRTypesetterRetain(ref); }
    static void Release(TRTypesetterRef ref) { TRTypesetterRelease(ref); }
};

} // namespace marshal
} // namespace tehreer

#endif
