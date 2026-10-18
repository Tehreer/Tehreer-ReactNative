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

void CollectTRTypefaceManagerEnumerateTypefaces_callback(TRTypefaceRef typeface, void *context, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(context);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Value item = marshal::FromHandle<TRTypefaceRef>(rt, typeface, marshal::Ownership::Retain);
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

void CollectTRTypefaceManagerEnumerateFamilies_callback(TRUInteger familyID, const TRStringView *familyName, void *context, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(context);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "familyID", marshal::FromNumber<TRUInteger>(rt, familyID));
        object.setProperty(rt, "familyName", marshal::FromStringView(rt, familyName));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

jsi::Value BindTRTypefaceManagerRegisterTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerRegisterTypeface";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);
    TRUInteger a_tag = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "tag");
    TRUInteger a_familyID = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "familyID");

    auto result = TRTypefaceManagerRegisterTypeface(a_typeface, a_tag, a_familyID);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypefaceManagerUnregisterTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerUnregisterTypeface";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceManagerUnregisterTypeface(a_typeface);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypefaceManagerGetTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerGetTypeface";
    TRUInteger a_tag = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 0), kFunction, "tag");

    auto result = TRTypefaceManagerGetTypeface(a_tag);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRTypefaceManagerGetTypefaceTag(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerGetTypefaceTag";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceManagerGetTypefaceTag(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceManagerGetTypefaceFamilyID(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerGetTypefaceFamilyID";
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typeface", false);

    auto result = TRTypefaceManagerGetTypefaceFamilyID(a_typeface);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypefaceManagerGetMatchingTypefaceByFamilyID(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerGetMatchingTypefaceByFamilyID";
    TRUInteger a_familyID = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 0), kFunction, "familyID");
    TRWidth a_width = marshal::ToNumber<TRWidth>(rt, marshal::ArgAt(args, count, 1), kFunction, "width");
    TRWeight a_weight = marshal::ToNumber<TRWeight>(rt, marshal::ArgAt(args, count, 2), kFunction, "weight");
    TRSlope a_slope = marshal::ToNumber<TRSlope>(rt, marshal::ArgAt(args, count, 3), kFunction, "slope");

    auto result = TRTypefaceManagerGetMatchingTypefaceByFamilyID(a_familyID, a_width, a_weight, a_slope);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRTypefaceManagerGetMatchingTypefaceByFamilyName(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerGetMatchingTypefaceByFamilyName";
    marshal::StringViewArg a_familyName = marshal::ToStringView(rt, marshal::ArgAt(args, count, 0), kFunction, "familyName", false);
    TRWidth a_width = marshal::ToNumber<TRWidth>(rt, marshal::ArgAt(args, count, 1), kFunction, "width");
    TRWeight a_weight = marshal::ToNumber<TRWeight>(rt, marshal::ArgAt(args, count, 2), kFunction, "weight");
    TRSlope a_slope = marshal::ToNumber<TRSlope>(rt, marshal::ArgAt(args, count, 3), kFunction, "slope");

    auto result = TRTypefaceManagerGetMatchingTypefaceByFamilyName(a_familyName.get(), a_width, a_weight, a_slope);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRTypefaceManagerEnumerateTypefaces(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerEnumerateTypefaces";
    marshal::Collector collector(rt);

    TRTypefaceManagerEnumerateTypefaces(CollectTRTypefaceManagerEnumerateTypefaces_callback, &collector);
    jsi::Value items = collector.Finish();
    return items;
}

jsi::Value BindTRTypefaceManagerEnumerateFamilies(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypefaceManagerEnumerateFamilies";
    marshal::Collector collector(rt);

    TRTypefaceManagerEnumerateFamilies(CollectTRTypefaceManagerEnumerateFamilies_callback, &collector);
    jsi::Value items = collector.Finish();
    return items;
}

} // namespace

void InstallTRTypefaceManager(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRTypefaceManagerRegisterTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerRegisterTypeface"), 3, &BindTRTypefaceManagerRegisterTypeface));
    target.setProperty(rt, "TRTypefaceManagerUnregisterTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerUnregisterTypeface"), 1, &BindTRTypefaceManagerUnregisterTypeface));
    target.setProperty(rt, "TRTypefaceManagerGetTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerGetTypeface"), 1, &BindTRTypefaceManagerGetTypeface));
    target.setProperty(rt, "TRTypefaceManagerGetTypefaceTag", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerGetTypefaceTag"), 1, &BindTRTypefaceManagerGetTypefaceTag));
    target.setProperty(rt, "TRTypefaceManagerGetTypefaceFamilyID", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerGetTypefaceFamilyID"), 1, &BindTRTypefaceManagerGetTypefaceFamilyID));
    target.setProperty(rt, "TRTypefaceManagerGetMatchingTypefaceByFamilyID", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerGetMatchingTypefaceByFamilyID"), 4, &BindTRTypefaceManagerGetMatchingTypefaceByFamilyID));
    target.setProperty(rt, "TRTypefaceManagerGetMatchingTypefaceByFamilyName", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerGetMatchingTypefaceByFamilyName"), 4, &BindTRTypefaceManagerGetMatchingTypefaceByFamilyName));
    target.setProperty(rt, "TRTypefaceManagerEnumerateTypefaces", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerEnumerateTypefaces"), 0, &BindTRTypefaceManagerEnumerateTypefaces));
    target.setProperty(rt, "TRTypefaceManagerEnumerateFamilies", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypefaceManagerEnumerateFamilies"), 0, &BindTRTypefaceManagerEnumerateFamilies));
}

} // namespace generated
} // namespace tehreer
