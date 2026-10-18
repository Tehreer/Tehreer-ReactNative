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

jsi::Value BindTRShapingEngineGetScriptDefaultDirection(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetScriptDefaultDirection";
    TRTag a_scriptTag = marshal::ToNumber<TRTag>(rt, marshal::ArgAt(args, count, 0), kFunction, "scriptTag");

    auto result = TRShapingEngineGetScriptDefaultDirection(a_scriptTag);
    return marshal::FromNumber<TRWritingDirection>(rt, result);
}

jsi::Value BindTRShapingEngineGetLanguageTagForName(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetLanguageTagForName";
    marshal::CStringArg a_languageName = marshal::ToCString(rt, marshal::ArgAt(args, count, 0), kFunction, "languageName", false);

    auto result = TRShapingEngineGetLanguageTagForName(a_languageName.get());
    return marshal::FromNumber<TRTag>(rt, result);
}

jsi::Value BindTRShapingEngineCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineCreate";

    auto result = TRShapingEngineCreate();
    return marshal::FromHandle<TRShapingEngineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRShapingEngineSetTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineSetTypeface";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "typeface", true);

    TRShapingEngineSetTypeface(a_engine, a_typeface);
    return jsi::Value::undefined();
}

jsi::Value BindTRShapingEngineGetTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetTypeface";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetTypeface(a_engine);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRShapingEngineSetTypeSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineSetTypeSize";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    TRFloat a_typeSize = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "typeSize");

    TRShapingEngineSetTypeSize(a_engine, a_typeSize);
    return jsi::Value::undefined();
}

jsi::Value BindTRShapingEngineGetTypeSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetTypeSize";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetTypeSize(a_engine);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRShapingEngineSetScriptTag(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineSetScriptTag";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    TRTag a_scriptTag = marshal::ToNumber<TRTag>(rt, marshal::ArgAt(args, count, 1), kFunction, "scriptTag");

    TRShapingEngineSetScriptTag(a_engine, a_scriptTag);
    return jsi::Value::undefined();
}

jsi::Value BindTRShapingEngineGetScriptTag(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetScriptTag";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetScriptTag(a_engine);
    return marshal::FromNumber<TRTag>(rt, result);
}

jsi::Value BindTRShapingEngineSetLanguageTag(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineSetLanguageTag";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    TRTag a_languageTag = marshal::ToNumber<TRTag>(rt, marshal::ArgAt(args, count, 1), kFunction, "languageTag");

    TRShapingEngineSetLanguageTag(a_engine, a_languageTag);
    return jsi::Value::undefined();
}

jsi::Value BindTRShapingEngineGetLanguageTag(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetLanguageTag";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetLanguageTag(a_engine);
    return marshal::FromNumber<TRTag>(rt, result);
}

jsi::Value BindTRShapingEngineSetWritingDirection(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineSetWritingDirection";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    TRWritingDirection a_writingDirection = marshal::ToNumber<TRWritingDirection>(rt, marshal::ArgAt(args, count, 1), kFunction, "writingDirection");

    TRShapingEngineSetWritingDirection(a_engine, a_writingDirection);
    return jsi::Value::undefined();
}

jsi::Value BindTRShapingEngineGetWritingDirection(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetWritingDirection";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetWritingDirection(a_engine);
    return marshal::FromNumber<TRWritingDirection>(rt, result);
}

jsi::Value BindTRShapingEngineSetShapingOrder(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineSetShapingOrder";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    TRShapingOrder a_shapingOrder = marshal::ToNumber<TRShapingOrder>(rt, marshal::ArgAt(args, count, 1), kFunction, "shapingOrder");

    TRShapingEngineSetShapingOrder(a_engine, a_shapingOrder);
    return jsi::Value::undefined();
}

jsi::Value BindTRShapingEngineGetShapingOrder(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetShapingOrder";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetShapingOrder(a_engine);
    return marshal::FromNumber<TRShapingOrder>(rt, result);
}

jsi::Value BindTRShapingEngineSetOpenTypeFeatures(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineSetOpenTypeFeatures";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    std::vector<TROpenTypeFeature> v_features;
    size_t n_features = 0;
    const TROpenTypeFeature *a_features = nullptr;
    if (!marshal::IsNullish(marshal::ArgAt(args, count, 1))) {
        jsi::Array array = marshal::ToArray(rt, marshal::ArgAt(args, count, 1), kFunction, "features");
        n_features = array.size(rt);
        v_features.reserve(n_features);
        for (size_t index = 0; index < n_features; index++) {
            v_features.push_back(TROpenTypeFeatureFromJs(rt, array.getValueAtIndex(rt, index), kFunction, "features"));
        }
        a_features = v_features.data();
    }
    TRUInteger a_count = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "count");

    if (a_features != nullptr) {
        marshal::RequireElements(rt, kFunction, "features", static_cast<size_t>(a_count), n_features);
    }

    auto result = TRShapingEngineSetOpenTypeFeatures(a_engine, a_features, a_count);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRShapingEngineGetOpenTypeFeaturesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetOpenTypeFeaturesPtr";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetOpenTypeFeaturesPtr(a_engine);
    return marshal::MakePointerView(rt, result, "TROpenTypeFeature", sizeof(TROpenTypeFeature), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRShapingEngineGetOpenTypeFeatureCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineGetOpenTypeFeatureCount";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineGetOpenTypeFeatureCount(a_engine);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRShapingEngineCreateShapingResult(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineCreateShapingResult";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);
    marshal::ConstBuffer a_codeUnits = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnits", false);
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRStringEncoding a_encoding = marshal::ToNumber<TRStringEncoding>(rt, marshal::ArgAt(args, count, 3), kFunction, "encoding");

    marshal::RequireCapacity(rt, kFunction, "codeUnits", static_cast<size_t>(a_length), marshal::CodeUnitSize(a_encoding), a_codeUnits.byteLength);

    auto result = TRShapingEngineCreateShapingResult(a_engine, a_codeUnits.data, a_length, a_encoding);
    return marshal::FromHandle<TRShapingResultRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRShapingEngineRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingEngineRetain";
    TRShapingEngineRef a_engine = marshal::ToHandle<TRShapingEngineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "engine", false);

    auto result = TRShapingEngineRetain(a_engine);
    return marshal::FromHandle<TRShapingEngineRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRShapingEngine(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRShapingEngineGetScriptDefaultDirection", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetScriptDefaultDirection"), 1, &BindTRShapingEngineGetScriptDefaultDirection));
    target.setProperty(rt, "TRShapingEngineGetLanguageTagForName", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetLanguageTagForName"), 1, &BindTRShapingEngineGetLanguageTagForName));
    target.setProperty(rt, "TRShapingEngineCreate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineCreate"), 0, &BindTRShapingEngineCreate));
    target.setProperty(rt, "TRShapingEngineSetTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineSetTypeface"), 2, &BindTRShapingEngineSetTypeface));
    target.setProperty(rt, "TRShapingEngineGetTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetTypeface"), 1, &BindTRShapingEngineGetTypeface));
    target.setProperty(rt, "TRShapingEngineSetTypeSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineSetTypeSize"), 2, &BindTRShapingEngineSetTypeSize));
    target.setProperty(rt, "TRShapingEngineGetTypeSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetTypeSize"), 1, &BindTRShapingEngineGetTypeSize));
    target.setProperty(rt, "TRShapingEngineSetScriptTag", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineSetScriptTag"), 2, &BindTRShapingEngineSetScriptTag));
    target.setProperty(rt, "TRShapingEngineGetScriptTag", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetScriptTag"), 1, &BindTRShapingEngineGetScriptTag));
    target.setProperty(rt, "TRShapingEngineSetLanguageTag", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineSetLanguageTag"), 2, &BindTRShapingEngineSetLanguageTag));
    target.setProperty(rt, "TRShapingEngineGetLanguageTag", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetLanguageTag"), 1, &BindTRShapingEngineGetLanguageTag));
    target.setProperty(rt, "TRShapingEngineSetWritingDirection", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineSetWritingDirection"), 2, &BindTRShapingEngineSetWritingDirection));
    target.setProperty(rt, "TRShapingEngineGetWritingDirection", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetWritingDirection"), 1, &BindTRShapingEngineGetWritingDirection));
    target.setProperty(rt, "TRShapingEngineSetShapingOrder", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineSetShapingOrder"), 2, &BindTRShapingEngineSetShapingOrder));
    target.setProperty(rt, "TRShapingEngineGetShapingOrder", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetShapingOrder"), 1, &BindTRShapingEngineGetShapingOrder));
    target.setProperty(rt, "TRShapingEngineSetOpenTypeFeatures", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineSetOpenTypeFeatures"), 3, &BindTRShapingEngineSetOpenTypeFeatures));
    target.setProperty(rt, "TRShapingEngineGetOpenTypeFeaturesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetOpenTypeFeaturesPtr"), 1, &BindTRShapingEngineGetOpenTypeFeaturesPtr));
    target.setProperty(rt, "TRShapingEngineGetOpenTypeFeatureCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineGetOpenTypeFeatureCount"), 1, &BindTRShapingEngineGetOpenTypeFeatureCount));
    target.setProperty(rt, "TRShapingEngineCreateShapingResult", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineCreateShapingResult"), 4, &BindTRShapingEngineCreateShapingResult));
    target.setProperty(rt, "TRShapingEngineRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingEngineRetain"), 1, &BindTRShapingEngineRetain));
}

} // namespace generated
} // namespace tehreer
