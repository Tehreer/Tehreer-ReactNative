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

#ifndef TEHREER_GENERATED_LAYOUTS_H
#define TEHREER_GENERATED_LAYOUTS_H

#include <cstddef>
#include <type_traits>

#include "GeneratedSupport.h"

#define TEHREER_STALE " differs from the header that the bindings were generated from; run npm run generate"

#define TEHREER_CHECK_UNION(Real, Mirror) \
    static_assert(sizeof(Real) == sizeof(Mirror), #Real ": the size" TEHREER_STALE); \
    static_assert(alignof(Real) == alignof(Mirror), #Real ": the alignment" TEHREER_STALE)

// offsetof is only defined for a standard-layout type.
#define TEHREER_CHECK_STRUCT(Real, Mirror) \
    TEHREER_CHECK_UNION(Real, Mirror); \
    static_assert(std::is_standard_layout<Real>::value, #Real ": must stay a standard-layout struct")

#define TEHREER_CHECK_UNION_MEMBER(Real, Mirror, member) \
    static_assert(std::is_same<decltype(Real::member), decltype(Mirror::member)>::value, #Real "." #member ": the type" TEHREER_STALE)

// Every member of a union is at offset zero by definition, so a union has no offset to check.
#define TEHREER_CHECK_MEMBER(Real, Mirror, member) \
    TEHREER_CHECK_UNION_MEMBER(Real, Mirror, member); \
    static_assert(offsetof(Real, member) == offsetof(Mirror, member), #Real "." #member ": the offset" TEHREER_STALE)

namespace tehreer {
namespace generated {
namespace layouts {

union TRAttributeValueLayout {
    TRTypefaceRef typeface;
    TRFloat typeSize;
    TRFloat scaleX;
    TRFloat scaleY;
    TRFloat baselineOffset;
    TRFloat obliqueness;
    TRReplacementRef replacement;
    TRColor foregroundColor;
    TRColor backgroundColor;
    TRBoolean underline;
    TRBoolean strikethrough;
    TRColor decorationColor;
    const void *userData;
    TRTag language;
    TRFontFeaturesRef fontFeatures;
    TRTextAlignment textAlignment;
    TRFloat firstLineHeadIndent;
    TRFloat headIndent;
    TRFloat tailIndent;
    TRUInteger firstIndentLineCount;
    TRFloat paragraphSpacingBefore;
    TRFloat paragraphSpacing;
    TRFloat lineHeightMultiple;
    TRFloat minimumLineHeight;
    TRFloat maximumLineHeight;
    TRFloat lineSpacing;
};
TEHREER_CHECK_UNION(TRAttributeValue, TRAttributeValueLayout);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, typeface);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, typeSize);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, scaleX);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, scaleY);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, baselineOffset);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, obliqueness);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, replacement);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, foregroundColor);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, backgroundColor);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, underline);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, strikethrough);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, decorationColor);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, userData);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, language);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, fontFeatures);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, textAlignment);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, firstLineHeadIndent);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, headIndent);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, tailIndent);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, firstIndentLineCount);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, paragraphSpacingBefore);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, paragraphSpacing);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, lineHeightMultiple);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, minimumLineHeight);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, maximumLineHeight);
TEHREER_CHECK_UNION_MEMBER(TRAttributeValue, TRAttributeValueLayout, lineSpacing);

struct TRAttributeLayout {
    TRAttributeType type;
    TRAttributeValue value;
};
TEHREER_CHECK_STRUCT(TRAttribute, TRAttributeLayout);
TEHREER_CHECK_MEMBER(TRAttribute, TRAttributeLayout, type);
TEHREER_CHECK_MEMBER(TRAttribute, TRAttributeLayout, value);

struct TRDrawCallbacksLayout {
    void (*drawGlyphImage)(void *userData, TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRColor color, const TRRect *clip);
    void (*drawGlyphPath)(void *userData, TRPathRef path, TRPoint origin, TRDrawStyle style, TRColor color, const TRRect *clip);
    void (*fillRect)(void *userData, TRRect rect, TRColor color);
    void (*drawReplacement)(void *userData, const struct _TRGlyphRun *run, TRPoint origin);
    void (*beginShadow)(void *userData, TRFloat radius, TRFloat dx, TRFloat dy, TRColor color);
    void (*endShadow)(void *userData);
};
TEHREER_CHECK_STRUCT(TRDrawCallbacks, TRDrawCallbacksLayout);
TEHREER_CHECK_MEMBER(TRDrawCallbacks, TRDrawCallbacksLayout, drawGlyphImage);
TEHREER_CHECK_MEMBER(TRDrawCallbacks, TRDrawCallbacksLayout, drawGlyphPath);
TEHREER_CHECK_MEMBER(TRDrawCallbacks, TRDrawCallbacksLayout, fillRect);
TEHREER_CHECK_MEMBER(TRDrawCallbacks, TRDrawCallbacksLayout, drawReplacement);
TEHREER_CHECK_MEMBER(TRDrawCallbacks, TRDrawCallbacksLayout, beginShadow);
TEHREER_CHECK_MEMBER(TRDrawCallbacks, TRDrawCallbacksLayout, endShadow);

struct TROpenTypeFeatureLayout {
    TRTag tag;
    TRUInt32 value;
};
TEHREER_CHECK_STRUCT(TROpenTypeFeature, TROpenTypeFeatureLayout);
TEHREER_CHECK_MEMBER(TROpenTypeFeature, TROpenTypeFeatureLayout, tag);
TEHREER_CHECK_MEMBER(TROpenTypeFeature, TROpenTypeFeatureLayout, value);

struct TRPointLayout {
    TRFloat x;
    TRFloat y;
};
TEHREER_CHECK_STRUCT(TRPoint, TRPointLayout);
TEHREER_CHECK_MEMBER(TRPoint, TRPointLayout, x);
TEHREER_CHECK_MEMBER(TRPoint, TRPointLayout, y);

struct TRSizeLayout {
    TRFloat width;
    TRFloat height;
};
TEHREER_CHECK_STRUCT(TRSize, TRSizeLayout);
TEHREER_CHECK_MEMBER(TRSize, TRSizeLayout, width);
TEHREER_CHECK_MEMBER(TRSize, TRSizeLayout, height);

struct TRRectLayout {
    TRPoint origin;
    TRSize size;
};
TEHREER_CHECK_STRUCT(TRRect, TRRectLayout);
TEHREER_CHECK_MEMBER(TRRect, TRRectLayout, origin);
TEHREER_CHECK_MEMBER(TRRect, TRRectLayout, size);

struct TRAffineTransformLayout {
    TRFloat a;
    TRFloat b;
    TRFloat c;
    TRFloat d;
    TRFloat tx;
    TRFloat ty;
};
TEHREER_CHECK_STRUCT(TRAffineTransform, TRAffineTransformLayout);
TEHREER_CHECK_MEMBER(TRAffineTransform, TRAffineTransformLayout, a);
TEHREER_CHECK_MEMBER(TRAffineTransform, TRAffineTransformLayout, b);
TEHREER_CHECK_MEMBER(TRAffineTransform, TRAffineTransformLayout, c);
TEHREER_CHECK_MEMBER(TRAffineTransform, TRAffineTransformLayout, d);
TEHREER_CHECK_MEMBER(TRAffineTransform, TRAffineTransformLayout, tx);
TEHREER_CHECK_MEMBER(TRAffineTransform, TRAffineTransformLayout, ty);

struct TRPathCallbacksLayout {
    void (*moveTo)(void *userData, TRFloat x, TRFloat y, TRBoolean *stop);
    void (*lineTo)(void *userData, TRFloat x, TRFloat y, TRBoolean *stop);
    void (*quadTo)(void *userData, TRFloat controlX, TRFloat controlY, TRFloat x, TRFloat y, TRBoolean *stop);
    void (*cubicTo)(void *userData, TRFloat control1X, TRFloat control1Y, TRFloat control2X, TRFloat control2Y, TRFloat x, TRFloat y, TRBoolean *stop);
    void (*close)(void *userData, TRBoolean *stop);
};
TEHREER_CHECK_STRUCT(TRPathCallbacks, TRPathCallbacksLayout);
TEHREER_CHECK_MEMBER(TRPathCallbacks, TRPathCallbacksLayout, moveTo);
TEHREER_CHECK_MEMBER(TRPathCallbacks, TRPathCallbacksLayout, lineTo);
TEHREER_CHECK_MEMBER(TRPathCallbacks, TRPathCallbacksLayout, quadTo);
TEHREER_CHECK_MEMBER(TRPathCallbacks, TRPathCallbacksLayout, cubicTo);
TEHREER_CHECK_MEMBER(TRPathCallbacks, TRPathCallbacksLayout, close);

struct TRReplacementRoomLayout {
    TRFloat ascent;
    TRFloat descent;
    TRFloat extent;
};
TEHREER_CHECK_STRUCT(TRReplacementRoom, TRReplacementRoomLayout);
TEHREER_CHECK_MEMBER(TRReplacementRoom, TRReplacementRoomLayout, ascent);
TEHREER_CHECK_MEMBER(TRReplacementRoom, TRReplacementRoomLayout, descent);
TEHREER_CHECK_MEMBER(TRReplacementRoom, TRReplacementRoomLayout, extent);

struct TRReplacementCallbacksLayout {
    void (*computeRoom)(void *userData, TRFloat layoutWidth, TRReplacementRoom *room);
    void (*finalize)(void *userData);
};
TEHREER_CHECK_STRUCT(TRReplacementCallbacks, TRReplacementCallbacksLayout);
TEHREER_CHECK_MEMBER(TRReplacementCallbacks, TRReplacementCallbacksLayout, computeRoom);
TEHREER_CHECK_MEMBER(TRReplacementCallbacks, TRReplacementCallbacksLayout, finalize);

struct TRStringViewLayout {
    const void *buffer;
    TRUInteger length;
    TRStringEncoding encoding;
};
TEHREER_CHECK_STRUCT(TRStringView, TRStringViewLayout);
TEHREER_CHECK_MEMBER(TRStringView, TRStringViewLayout, buffer);
TEHREER_CHECK_MEMBER(TRStringView, TRStringViewLayout, length);
TEHREER_CHECK_MEMBER(TRStringView, TRStringViewLayout, encoding);

struct TRVariationAxisLayout {
    const TRStringView *name;
    TRTag tag;
    TRUInt32 flags;
    TRFloat minValue;
    TRFloat maxValue;
    TRFloat defaultValue;
};
TEHREER_CHECK_STRUCT(TRVariationAxis, TRVariationAxisLayout);
TEHREER_CHECK_MEMBER(TRVariationAxis, TRVariationAxisLayout, name);
TEHREER_CHECK_MEMBER(TRVariationAxis, TRVariationAxisLayout, tag);
TEHREER_CHECK_MEMBER(TRVariationAxis, TRVariationAxisLayout, flags);
TEHREER_CHECK_MEMBER(TRVariationAxis, TRVariationAxisLayout, minValue);
TEHREER_CHECK_MEMBER(TRVariationAxis, TRVariationAxisLayout, maxValue);
TEHREER_CHECK_MEMBER(TRVariationAxis, TRVariationAxisLayout, defaultValue);

struct TRBitmapStrikeLayout {
    TRFloat pixelWidth;
    TRFloat pixelHeight;
};
TEHREER_CHECK_STRUCT(TRBitmapStrike, TRBitmapStrikeLayout);
TEHREER_CHECK_MEMBER(TRBitmapStrike, TRBitmapStrikeLayout, pixelWidth);
TEHREER_CHECK_MEMBER(TRBitmapStrike, TRBitmapStrikeLayout, pixelHeight);

struct TRNamedStyleLayout {
    const TRStringView *subfamilyName;
    const TRFloat *coordinatesPtr;
    TRUInteger coordinateCount;
    const TRStringView *postScriptName;
};
TEHREER_CHECK_STRUCT(TRNamedStyle, TRNamedStyleLayout);
TEHREER_CHECK_MEMBER(TRNamedStyle, TRNamedStyleLayout, subfamilyName);
TEHREER_CHECK_MEMBER(TRNamedStyle, TRNamedStyleLayout, coordinatesPtr);
TEHREER_CHECK_MEMBER(TRNamedStyle, TRNamedStyleLayout, coordinateCount);
TEHREER_CHECK_MEMBER(TRNamedStyle, TRNamedStyleLayout, postScriptName);

struct TRPaletteEntryLayout {
    const TRStringView *name;
};
TEHREER_CHECK_STRUCT(TRPaletteEntry, TRPaletteEntryLayout);
TEHREER_CHECK_MEMBER(TRPaletteEntry, TRPaletteEntryLayout, name);

struct TRPredefinedPaletteLayout {
    const TRStringView *name;
    const TRColor *colorsPtr;
    TRUInteger colorCount;
    TRUInt32 flags;
};
TEHREER_CHECK_STRUCT(TRPredefinedPalette, TRPredefinedPaletteLayout);
TEHREER_CHECK_MEMBER(TRPredefinedPalette, TRPredefinedPaletteLayout, name);
TEHREER_CHECK_MEMBER(TRPredefinedPalette, TRPredefinedPaletteLayout, colorsPtr);
TEHREER_CHECK_MEMBER(TRPredefinedPalette, TRPredefinedPaletteLayout, colorCount);
TEHREER_CHECK_MEMBER(TRPredefinedPalette, TRPredefinedPaletteLayout, flags);

} // namespace layouts
} // namespace generated
} // namespace tehreer

#undef TEHREER_CHECK_MEMBER
#undef TEHREER_CHECK_UNION_MEMBER
#undef TEHREER_CHECK_STRUCT
#undef TEHREER_CHECK_UNION
#undef TEHREER_STALE

#endif
