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

#include "Bindings.h"

#include "GeneratedSupport.h"
#include "Handles.h"
#include "Structs.h"

namespace tehreer {
namespace generated {
namespace {

jsi::Value BindTRTypefaceGetWeight(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetWeight";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetWeight(a_typeface);
    return marshal::FromNumber<TRWeight>(rt, result);
}

jsi::Value BindTRTypefaceGetWidth(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetWidth";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetWidth(a_typeface);
    return marshal::FromNumber<TRWidth>(rt, result);
}

jsi::Value BindTRTypefaceGetSlope(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetSlope";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetSlope(a_typeface);
    return marshal::FromNumber<TRSlope>(rt, result);
}

jsi::Value BindTRTypefaceGetUnitsPerEM(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetUnitsPerEM";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetUnitsPerEM(a_typeface);
    return marshal::FromNumber<TRUInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetAscent(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetAscent";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetAscent(a_typeface);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetDescent(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetDescent";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetDescent(a_typeface);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetLeading(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetLeading";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetLeading(a_typeface);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetGlyphCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetGlyphCount";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetGlyphCount(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceIsVariable(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceIsVariable";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceIsVariable(a_typeface);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypefaceGetVariationAxesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetVariationAxesPtr";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetVariationAxesPtr(a_typeface);
    return marshal::MakePointerView(rt, result, "TRVariationAxis", sizeof(TRVariationAxis), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRTypefaceGetVariationAxisCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetVariationAxisCount";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetVariationAxisCount(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceGetNamedStylesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetNamedStylesPtr";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetNamedStylesPtr(a_typeface);
    return marshal::MakePointerView(rt, result, "TRNamedStyle", sizeof(TRNamedStyle), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRTypefaceGetNamedStyleCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetNamedStyleCount";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetNamedStyleCount(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceGetPaletteEntriesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetPaletteEntriesPtr";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetPaletteEntriesPtr(a_typeface);
    return marshal::MakePointerView(rt, result, "TRPaletteEntry", sizeof(TRPaletteEntry), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRTypefaceGetPaletteEntryCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetPaletteEntryCount";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetPaletteEntryCount(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceGetPredefinedPalettesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetPredefinedPalettesPtr";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetPredefinedPalettesPtr(a_typeface);
    return marshal::MakePointerView(rt, result, "TRPredefinedPalette", sizeof(TRPredefinedPalette), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRTypefaceGetPredefinedPaletteCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetPredefinedPaletteCount";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetPredefinedPaletteCount(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceIsScalable(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceIsScalable";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceIsScalable(a_typeface);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypefaceGetBitmapStrikesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetBitmapStrikesPtr";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetBitmapStrikesPtr(a_typeface);
    return marshal::MakePointerView(rt, result, "TRBitmapStrike", sizeof(TRBitmapStrike), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRTypefaceGetBitmapStrikeCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetBitmapStrikeCount";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetBitmapStrikeCount(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceGetVariationCoordinatesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetVariationCoordinatesPtr";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetVariationCoordinatesPtr(a_typeface);
    return marshal::MakePointerView(rt, result, "TRFloat", sizeof(TRFloat), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRTypefaceGetAssociatedColorsPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetAssociatedColorsPtr";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetAssociatedColorsPtr(a_typeface);
    return marshal::MakePointerView(rt, result, "TRColor", sizeof(TRColor), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRTypefaceCreateWithVariation(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceCreateWithVariation";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRUInteger a_count = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "count");
    marshal::ConstBuffer a_coordinates = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "coordinates", true);

    if (a_coordinates.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "coordinates", static_cast<size_t>(a_count), sizeof(TRFloat), a_coordinates.byteLength);
    }

    auto result = TRTypefaceCreateWithVariation(a_typeface, static_cast<const TRFloat *>(a_coordinates.data), a_count);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypefaceCreateWithColors(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceCreateWithColors";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRUInteger a_count = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "count");
    marshal::ConstBuffer a_colors = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "colors", true);

    if (a_colors.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "colors", static_cast<size_t>(a_count), sizeof(TRColor), a_colors.byteLength);
    }

    auto result = TRTypefaceCreateWithColors(a_typeface, static_cast<const TRColor *>(a_colors.data), a_count);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypefaceGetFamilyName(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetFamilyName";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetFamilyName(a_typeface);
    return marshal::FromStringView(rt, result);
}

jsi::Value BindTRTypefaceGetStyleName(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetStyleName";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetStyleName(a_typeface);
    return marshal::FromStringView(rt, result);
}

jsi::Value BindTRTypefaceGetFullName(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetFullName";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetFullName(a_typeface);
    return marshal::FromStringView(rt, result);
}

jsi::Value BindTRTypefaceGetBoundingBox(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetBoundingBox";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetBoundingBox(a_typeface);
    return TRRectToJs(rt, result);
}

jsi::Value BindTRTypefaceGetUnderlinePosition(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetUnderlinePosition";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetUnderlinePosition(a_typeface);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetUnderlineThickness(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetUnderlineThickness";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetUnderlineThickness(a_typeface);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetStrikeoutPosition(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetStrikeoutPosition";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetStrikeoutPosition(a_typeface);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetStrikeoutThickness(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetStrikeoutThickness";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceGetStrikeoutThickness(a_typeface);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRTypefaceGetGlyphID(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetGlyphID";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRUInt32 a_codePoint = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 1), kFunction, "codePoint");

    auto result = TRTypefaceGetGlyphID(a_typeface, a_codePoint);
    return marshal::FromNumber<TRGlyphID>(rt, result);
}

jsi::Value BindTRTypefaceGetVariantGlyphID(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetVariantGlyphID";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRUInt32 a_codePoint = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 1), kFunction, "codePoint");
    TRUInt32 a_variantSelector = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 2), kFunction, "variantSelector");

    auto result = TRTypefaceGetVariantGlyphID(a_typeface, a_codePoint, a_variantSelector);
    return marshal::FromNumber<TRGlyphID>(rt, result);
}

jsi::Value BindTRTypefaceGetGlyphAdvance(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetGlyphAdvance";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRGlyphID a_glyphID = marshal::ToNumber<TRGlyphID>(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphID");
    TRFloat a_typeSize = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 2), kFunction, "typeSize");
    TRBoolean a_isVertical = (marshal::ToBoolean(rt, marshal::ArgAt(args, count, 3), kFunction, "isVertical") ? TRTrue : TRFalse);

    auto result = TRTypefaceGetGlyphAdvance(a_typeface, a_glyphID, a_typeSize, a_isVertical);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRTypefaceCreateGlyphPath(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceCreateGlyphPath";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRGlyphID a_glyphID = marshal::ToNumber<TRGlyphID>(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphID");
    TRFloat a_typeSize = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 2), kFunction, "typeSize");

    auto result = TRTypefaceCreateGlyphPath(a_typeface, a_glyphID, a_typeSize);
    return marshal::FromHandle<TRPathRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypefaceGetTableSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetTableSize";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRTag a_tag = marshal::ToNumber<TRTag>(rt, marshal::ArgAt(args, count, 1), kFunction, "tag");

    auto result = TRTypefaceGetTableSize(a_typeface, a_tag);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceGetTableData(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetTableData";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRTag a_tag = marshal::ToNumber<TRTag>(rt, marshal::ArgAt(args, count, 1), kFunction, "tag");
    TRUInteger a_offset = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "offset");
    TRUInteger a_capacity = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 4), kFunction, "capacity");
    marshal::MutableBuffer a_buffer = marshal::ToMutableBuffer(rt, marshal::ArgAt(args, count, 3), kFunction, "buffer", false);

    marshal::RequireCapacity(rt, kFunction, "buffer", static_cast<size_t>(a_capacity), 1, a_buffer.byteLength);

    auto result = TRTypefaceGetTableData(a_typeface, a_tag, a_offset, a_buffer.data, a_capacity);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceGetGlyphName(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceGetGlyphName";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRGlyphID a_glyphID = marshal::ToNumber<TRGlyphID>(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphID");
    TRUInteger a_capacity = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 3), kFunction, "capacity");
    marshal::MutableBuffer a_buffer = marshal::ToMutableBuffer(rt, marshal::ArgAt(args, count, 2), kFunction, "buffer", false);

    marshal::RequireCapacity(rt, kFunction, "buffer", static_cast<size_t>(a_capacity), 1, a_buffer.byteLength);

    auto result = TRTypefaceGetGlyphName(a_typeface, a_glyphID, static_cast<char *>(a_buffer.data), a_capacity);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceRetain";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceRetain(a_typeface);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRTypeface(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRTypefaceGetWeight", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetWeight"), 1, &BindTRTypefaceGetWeight));
    target.setProperty(rt, "TRTypefaceGetWidth", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetWidth"), 1, &BindTRTypefaceGetWidth));
    target.setProperty(rt, "TRTypefaceGetSlope", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetSlope"), 1, &BindTRTypefaceGetSlope));
    target.setProperty(rt, "TRTypefaceGetUnitsPerEM", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetUnitsPerEM"), 1, &BindTRTypefaceGetUnitsPerEM));
    target.setProperty(rt, "TRTypefaceGetAscent", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetAscent"), 1, &BindTRTypefaceGetAscent));
    target.setProperty(rt, "TRTypefaceGetDescent", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetDescent"), 1, &BindTRTypefaceGetDescent));
    target.setProperty(rt, "TRTypefaceGetLeading", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetLeading"), 1, &BindTRTypefaceGetLeading));
    target.setProperty(rt, "TRTypefaceGetGlyphCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetGlyphCount"), 1, &BindTRTypefaceGetGlyphCount));
    target.setProperty(rt, "TRTypefaceIsVariable", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceIsVariable"), 1, &BindTRTypefaceIsVariable));
    target.setProperty(rt, "TRTypefaceGetVariationAxesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetVariationAxesPtr"), 1, &BindTRTypefaceGetVariationAxesPtr));
    target.setProperty(rt, "TRTypefaceGetVariationAxisCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetVariationAxisCount"), 1, &BindTRTypefaceGetVariationAxisCount));
    target.setProperty(rt, "TRTypefaceGetNamedStylesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetNamedStylesPtr"), 1, &BindTRTypefaceGetNamedStylesPtr));
    target.setProperty(rt, "TRTypefaceGetNamedStyleCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetNamedStyleCount"), 1, &BindTRTypefaceGetNamedStyleCount));
    target.setProperty(rt, "TRTypefaceGetPaletteEntriesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetPaletteEntriesPtr"), 1, &BindTRTypefaceGetPaletteEntriesPtr));
    target.setProperty(rt, "TRTypefaceGetPaletteEntryCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetPaletteEntryCount"), 1, &BindTRTypefaceGetPaletteEntryCount));
    target.setProperty(rt, "TRTypefaceGetPredefinedPalettesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetPredefinedPalettesPtr"), 1, &BindTRTypefaceGetPredefinedPalettesPtr));
    target.setProperty(rt, "TRTypefaceGetPredefinedPaletteCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetPredefinedPaletteCount"), 1, &BindTRTypefaceGetPredefinedPaletteCount));
    target.setProperty(rt, "TRTypefaceIsScalable", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceIsScalable"), 1, &BindTRTypefaceIsScalable));
    target.setProperty(rt, "TRTypefaceGetBitmapStrikesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetBitmapStrikesPtr"), 1, &BindTRTypefaceGetBitmapStrikesPtr));
    target.setProperty(rt, "TRTypefaceGetBitmapStrikeCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetBitmapStrikeCount"), 1, &BindTRTypefaceGetBitmapStrikeCount));
    target.setProperty(rt, "TRTypefaceGetVariationCoordinatesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetVariationCoordinatesPtr"), 1, &BindTRTypefaceGetVariationCoordinatesPtr));
    target.setProperty(rt, "TRTypefaceGetAssociatedColorsPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetAssociatedColorsPtr"), 1, &BindTRTypefaceGetAssociatedColorsPtr));
    target.setProperty(rt, "TRTypefaceCreateWithVariation", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceCreateWithVariation"), 3, &BindTRTypefaceCreateWithVariation));
    target.setProperty(rt, "TRTypefaceCreateWithColors", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceCreateWithColors"), 3, &BindTRTypefaceCreateWithColors));
    target.setProperty(rt, "TRTypefaceGetFamilyName", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetFamilyName"), 1, &BindTRTypefaceGetFamilyName));
    target.setProperty(rt, "TRTypefaceGetStyleName", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetStyleName"), 1, &BindTRTypefaceGetStyleName));
    target.setProperty(rt, "TRTypefaceGetFullName", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetFullName"), 1, &BindTRTypefaceGetFullName));
    target.setProperty(rt, "TRTypefaceGetBoundingBox", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetBoundingBox"), 1, &BindTRTypefaceGetBoundingBox));
    target.setProperty(rt, "TRTypefaceGetUnderlinePosition", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetUnderlinePosition"), 1, &BindTRTypefaceGetUnderlinePosition));
    target.setProperty(rt, "TRTypefaceGetUnderlineThickness", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetUnderlineThickness"), 1, &BindTRTypefaceGetUnderlineThickness));
    target.setProperty(rt, "TRTypefaceGetStrikeoutPosition", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetStrikeoutPosition"), 1, &BindTRTypefaceGetStrikeoutPosition));
    target.setProperty(rt, "TRTypefaceGetStrikeoutThickness", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetStrikeoutThickness"), 1, &BindTRTypefaceGetStrikeoutThickness));
    target.setProperty(rt, "TRTypefaceGetGlyphID", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetGlyphID"), 2, &BindTRTypefaceGetGlyphID));
    target.setProperty(rt, "TRTypefaceGetVariantGlyphID", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetVariantGlyphID"), 3, &BindTRTypefaceGetVariantGlyphID));
    target.setProperty(rt, "TRTypefaceGetGlyphAdvance", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetGlyphAdvance"), 4, &BindTRTypefaceGetGlyphAdvance));
    target.setProperty(rt, "TRTypefaceCreateGlyphPath", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceCreateGlyphPath"), 3, &BindTRTypefaceCreateGlyphPath));
    target.setProperty(rt, "TRTypefaceGetTableSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetTableSize"), 2, &BindTRTypefaceGetTableSize));
    target.setProperty(rt, "TRTypefaceGetTableData", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetTableData"), 5, &BindTRTypefaceGetTableData));
    target.setProperty(rt, "TRTypefaceGetGlyphName", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceGetGlyphName"), 4, &BindTRTypefaceGetGlyphName));
    target.setProperty(rt, "TRTypefaceRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceRetain"), 1, &BindTRTypefaceRetain));
}

} // namespace generated
} // namespace tehreer
