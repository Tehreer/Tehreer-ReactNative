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

jsi::Value BindTRFrameResolverCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverCreate";

    auto result = TRFrameResolverCreate();
    return marshal::FromHandle<TRFrameResolverRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRFrameResolverGetTypesetter(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetTypesetter";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetTypesetter(a_resolver);
    return marshal::FromHandle<TRTypesetterRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRFrameResolverSetTypesetter(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetTypesetter";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "typesetter", true);

    TRFrameResolverSetTypesetter(a_resolver, a_typesetter);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetFrameSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetFrameSize";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetFrameSize(a_resolver);
    return TRSizeToJs(rt, result);
}

jsi::Value BindTRFrameResolverSetFrameSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetFrameSize";
    TRSize a_size = TRSizeFromJs(rt, marshal::ArgAt(args, count, 1), kFunction, "size");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetFrameSize(a_resolver, a_size);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetFitsHorizontally(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetFitsHorizontally";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetFitsHorizontally(a_resolver);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRFrameResolverSetFitsHorizontally(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetFitsHorizontally";
    TRBoolean a_fits = (marshal::ToBoolean(rt, marshal::ArgAt(args, count, 1), kFunction, "fits") ? TRTrue : TRFalse);
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetFitsHorizontally(a_resolver, a_fits);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetFitsVertically(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetFitsVertically";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetFitsVertically(a_resolver);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRFrameResolverSetFitsVertically(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetFitsVertically";
    TRBoolean a_fits = (marshal::ToBoolean(rt, marshal::ArgAt(args, count, 1), kFunction, "fits") ? TRTrue : TRFalse);
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetFitsVertically(a_resolver, a_fits);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetTextAlignment(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetTextAlignment";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetTextAlignment(a_resolver);
    return marshal::FromNumber<TRTextAlignment>(rt, result);
}

jsi::Value BindTRFrameResolverSetTextAlignment(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetTextAlignment";
    TRTextAlignment a_alignment = marshal::ToNumber<TRTextAlignment>(rt, marshal::ArgAt(args, count, 1), kFunction, "alignment");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetTextAlignment(a_resolver, a_alignment);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetVerticalAlignment(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetVerticalAlignment";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetVerticalAlignment(a_resolver);
    return marshal::FromNumber<TRVerticalAlignment>(rt, result);
}

jsi::Value BindTRFrameResolverSetVerticalAlignment(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetVerticalAlignment";
    TRVerticalAlignment a_alignment = marshal::ToNumber<TRVerticalAlignment>(rt, marshal::ArgAt(args, count, 1), kFunction, "alignment");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetVerticalAlignment(a_resolver, a_alignment);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetTruncationMode(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetTruncationMode";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetTruncationMode(a_resolver);
    return marshal::FromNumber<TRBreakMode>(rt, result);
}

jsi::Value BindTRFrameResolverSetTruncationMode(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetTruncationMode";
    TRBreakMode a_mode = marshal::ToNumber<TRBreakMode>(rt, marshal::ArgAt(args, count, 1), kFunction, "mode");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetTruncationMode(a_resolver, a_mode);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetTruncationPlace(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetTruncationPlace";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetTruncationPlace(a_resolver);
    return marshal::FromNumber<TRTruncationPlace>(rt, result);
}

jsi::Value BindTRFrameResolverSetTruncationPlace(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetTruncationPlace";
    TRTruncationPlace a_place = marshal::ToNumber<TRTruncationPlace>(rt, marshal::ArgAt(args, count, 1), kFunction, "place");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetTruncationPlace(a_resolver, a_place);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverIsTruncationEnabled(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverIsTruncationEnabled";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverIsTruncationEnabled(a_resolver);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRFrameResolverSetTruncationEnabled(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetTruncationEnabled";
    TRBoolean a_isEnabled = (marshal::ToBoolean(rt, marshal::ArgAt(args, count, 1), kFunction, "isEnabled") ? TRTrue : TRFalse);
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetTruncationEnabled(a_resolver, a_isEnabled);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverIsJustificationEnabled(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverIsJustificationEnabled";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverIsJustificationEnabled(a_resolver);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRFrameResolverSetJustificationEnabled(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetJustificationEnabled";
    TRBoolean a_isEnabled = (marshal::ToBoolean(rt, marshal::ArgAt(args, count, 1), kFunction, "isEnabled") ? TRTrue : TRFalse);
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetJustificationEnabled(a_resolver, a_isEnabled);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetJustificationLevel(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetJustificationLevel";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetJustificationLevel(a_resolver);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRFrameResolverSetJustificationLevel(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetJustificationLevel";
    TRFloat a_level = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "level");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetJustificationLevel(a_resolver, a_level);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetMaxLines(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetMaxLines";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetMaxLines(a_resolver);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRFrameResolverSetMaxLines(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetMaxLines";
    TRUInteger a_maxLines = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "maxLines");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetMaxLines(a_resolver, a_maxLines);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetExtraLineSpacing(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetExtraLineSpacing";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetExtraLineSpacing(a_resolver);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRFrameResolverSetExtraLineSpacing(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetExtraLineSpacing";
    TRFloat a_spacing = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "spacing");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetExtraLineSpacing(a_resolver, a_spacing);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverGetLineHeightMultiplier(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverGetLineHeightMultiplier";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverGetLineHeightMultiplier(a_resolver);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRFrameResolverSetLineHeightMultiplier(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverSetLineHeightMultiplier";
    TRFloat a_multiplier = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "multiplier");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    TRFrameResolverSetLineHeightMultiplier(a_resolver, a_multiplier);
    return jsi::Value::undefined();
}

jsi::Value BindTRFrameResolverCreateFrame(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverCreateFrame";
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverCreateFrame(a_resolver, a_index, a_length);
    return marshal::FromHandle<TRComposedFrameRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRFrameResolverRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFrameResolverRetain";
    TRFrameResolverRef a_resolver = marshal::ToHandle<TRFrameResolverRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "resolver", false);

    auto result = TRFrameResolverRetain(a_resolver);
    return marshal::FromHandle<TRFrameResolverRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRFrameResolver(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRFrameResolverCreate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverCreate"), 0, &BindTRFrameResolverCreate));
    target.setProperty(rt, "TRFrameResolverGetTypesetter", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetTypesetter"), 1, &BindTRFrameResolverGetTypesetter));
    target.setProperty(rt, "TRFrameResolverSetTypesetter", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetTypesetter"), 2, &BindTRFrameResolverSetTypesetter));
    target.setProperty(rt, "TRFrameResolverGetFrameSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetFrameSize"), 1, &BindTRFrameResolverGetFrameSize));
    target.setProperty(rt, "TRFrameResolverSetFrameSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetFrameSize"), 2, &BindTRFrameResolverSetFrameSize));
    target.setProperty(rt, "TRFrameResolverGetFitsHorizontally", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetFitsHorizontally"), 1, &BindTRFrameResolverGetFitsHorizontally));
    target.setProperty(rt, "TRFrameResolverSetFitsHorizontally", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetFitsHorizontally"), 2, &BindTRFrameResolverSetFitsHorizontally));
    target.setProperty(rt, "TRFrameResolverGetFitsVertically", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetFitsVertically"), 1, &BindTRFrameResolverGetFitsVertically));
    target.setProperty(rt, "TRFrameResolverSetFitsVertically", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetFitsVertically"), 2, &BindTRFrameResolverSetFitsVertically));
    target.setProperty(rt, "TRFrameResolverGetTextAlignment", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetTextAlignment"), 1, &BindTRFrameResolverGetTextAlignment));
    target.setProperty(rt, "TRFrameResolverSetTextAlignment", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetTextAlignment"), 2, &BindTRFrameResolverSetTextAlignment));
    target.setProperty(rt, "TRFrameResolverGetVerticalAlignment", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetVerticalAlignment"), 1, &BindTRFrameResolverGetVerticalAlignment));
    target.setProperty(rt, "TRFrameResolverSetVerticalAlignment", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetVerticalAlignment"), 2, &BindTRFrameResolverSetVerticalAlignment));
    target.setProperty(rt, "TRFrameResolverGetTruncationMode", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetTruncationMode"), 1, &BindTRFrameResolverGetTruncationMode));
    target.setProperty(rt, "TRFrameResolverSetTruncationMode", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetTruncationMode"), 2, &BindTRFrameResolverSetTruncationMode));
    target.setProperty(rt, "TRFrameResolverGetTruncationPlace", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetTruncationPlace"), 1, &BindTRFrameResolverGetTruncationPlace));
    target.setProperty(rt, "TRFrameResolverSetTruncationPlace", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetTruncationPlace"), 2, &BindTRFrameResolverSetTruncationPlace));
    target.setProperty(rt, "TRFrameResolverIsTruncationEnabled", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverIsTruncationEnabled"), 1, &BindTRFrameResolverIsTruncationEnabled));
    target.setProperty(rt, "TRFrameResolverSetTruncationEnabled", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetTruncationEnabled"), 2, &BindTRFrameResolverSetTruncationEnabled));
    target.setProperty(rt, "TRFrameResolverIsJustificationEnabled", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverIsJustificationEnabled"), 1, &BindTRFrameResolverIsJustificationEnabled));
    target.setProperty(rt, "TRFrameResolverSetJustificationEnabled", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetJustificationEnabled"), 2, &BindTRFrameResolverSetJustificationEnabled));
    target.setProperty(rt, "TRFrameResolverGetJustificationLevel", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetJustificationLevel"), 1, &BindTRFrameResolverGetJustificationLevel));
    target.setProperty(rt, "TRFrameResolverSetJustificationLevel", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetJustificationLevel"), 2, &BindTRFrameResolverSetJustificationLevel));
    target.setProperty(rt, "TRFrameResolverGetMaxLines", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetMaxLines"), 1, &BindTRFrameResolverGetMaxLines));
    target.setProperty(rt, "TRFrameResolverSetMaxLines", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetMaxLines"), 2, &BindTRFrameResolverSetMaxLines));
    target.setProperty(rt, "TRFrameResolverGetExtraLineSpacing", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetExtraLineSpacing"), 1, &BindTRFrameResolverGetExtraLineSpacing));
    target.setProperty(rt, "TRFrameResolverSetExtraLineSpacing", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetExtraLineSpacing"), 2, &BindTRFrameResolverSetExtraLineSpacing));
    target.setProperty(rt, "TRFrameResolverGetLineHeightMultiplier", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverGetLineHeightMultiplier"), 1, &BindTRFrameResolverGetLineHeightMultiplier));
    target.setProperty(rt, "TRFrameResolverSetLineHeightMultiplier", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverSetLineHeightMultiplier"), 2, &BindTRFrameResolverSetLineHeightMultiplier));
    target.setProperty(rt, "TRFrameResolverCreateFrame", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverCreateFrame"), 3, &BindTRFrameResolverCreateFrame));
    target.setProperty(rt, "TRFrameResolverRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFrameResolverRetain"), 1, &BindTRFrameResolverRetain));
}

} // namespace generated
} // namespace tehreer
