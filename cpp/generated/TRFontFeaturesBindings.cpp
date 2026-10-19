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

jsi::Value BindTRFontFeaturesCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFeaturesCreate";
    std::vector<TROpenTypeFeature> v_features;
    size_t n_features = 0;
    const TROpenTypeFeature *a_features = nullptr;
    if (!marshal::IsNullish(marshal::ArgAt(args, count, 0))) {
        jsi::Array array = marshal::ToArray(rt, marshal::ArgAt(args, count, 0), kFunction, "features");
        n_features = array.size(rt);
        v_features.reserve(n_features);
        for (size_t index = 0; index < n_features; index++) {
            v_features.push_back(TROpenTypeFeatureFromJs(rt, array.getValueAtIndex(rt, index), kFunction, "features"));
        }
        a_features = v_features.data();
    }
    TRUInteger a_count = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "count");

    if (a_features != nullptr) {
        marshal::RequireElements(rt, kFunction, "features", static_cast<size_t>(a_count), n_features);
    }

    auto result = TRFontFeaturesCreate(a_features, a_count);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRFontFeaturesRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRFontFeaturesGetItemsPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFeaturesGetItemsPtr";
    TRFontFeaturesRef a_features = marshal::ToHandle<TRFontFeaturesRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "features", false);

    auto result = TRFontFeaturesGetItemsPtr(a_features);
    marshal::RethrowCallbackError(rt);
    return marshal::MakePointerView(rt, result, "TROpenTypeFeature", sizeof(TROpenTypeFeature), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRFontFeaturesGetCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFeaturesGetCount";
    TRFontFeaturesRef a_features = marshal::ToHandle<TRFontFeaturesRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "features", false);

    auto result = TRFontFeaturesGetCount(a_features);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRFontFeaturesRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFeaturesRetain";
    TRFontFeaturesRef a_features = marshal::ToHandle<TRFontFeaturesRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "features", false);

    auto result = TRFontFeaturesRetain(a_features);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRFontFeaturesRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRFontFeatures(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRFontFeaturesCreate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFeaturesCreate"), 2, &BindTRFontFeaturesCreate));
    target.setProperty(rt, "TRFontFeaturesGetItemsPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFeaturesGetItemsPtr"), 1, &BindTRFontFeaturesGetItemsPtr));
    target.setProperty(rt, "TRFontFeaturesGetCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFeaturesGetCount"), 1, &BindTRFontFeaturesGetCount));
    target.setProperty(rt, "TRFontFeaturesRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFeaturesRetain"), 1, &BindTRFontFeaturesRetain));
}

} // namespace generated
} // namespace tehreer
