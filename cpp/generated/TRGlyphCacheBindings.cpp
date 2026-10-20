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

jsi::Value BindTRGlyphCacheCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphCacheCreate";
    marshal::BeginCall();
    TRUInteger a_capacity = marshal::ToIndex(rt, marshal::ArgAt(args, count, 0), kFunction, "capacity");

    auto result = TRGlyphCacheCreate(a_capacity);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRGlyphCacheRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRGlyphCacheGetDefault(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphCacheGetDefault";
    marshal::BeginCall();

    auto result = TRGlyphCacheGetDefault();
    marshal::RethrowCallbackError(rt);
    return marshal::FromHandle<TRGlyphCacheRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRGlyphCacheGetCapacity(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphCacheGetCapacity";
    marshal::BeginCall();
    TRGlyphCacheRef a_cache = marshal::ToHandle<TRGlyphCacheRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "cache", false);

    auto result = TRGlyphCacheGetCapacity(a_cache);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphCacheSetCapacity(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphCacheSetCapacity";
    marshal::BeginCall();
    TRUInteger a_capacity = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "capacity");
    TRGlyphCacheRef a_cache = marshal::ToHandle<TRGlyphCacheRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "cache", false);

    TRGlyphCacheSetCapacity(a_cache, a_capacity);
    marshal::RethrowCallbackError(rt);
    return jsi::Value::undefined();
}

jsi::Value BindTRGlyphCacheGetSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphCacheGetSize";
    marshal::BeginCall();
    TRGlyphCacheRef a_cache = marshal::ToHandle<TRGlyphCacheRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "cache", false);

    auto result = TRGlyphCacheGetSize(a_cache);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphCacheClear(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphCacheClear";
    marshal::BeginCall();
    TRGlyphCacheRef a_cache = marshal::ToHandle<TRGlyphCacheRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "cache", false);

    TRGlyphCacheClear(a_cache);
    marshal::RethrowCallbackError(rt);
    return jsi::Value::undefined();
}

jsi::Value BindTRGlyphCacheRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphCacheRetain";
    marshal::BeginCall();
    TRGlyphCacheRef a_cache = marshal::ToHandle<TRGlyphCacheRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "cache", false);

    auto result = TRGlyphCacheRetain(a_cache);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRGlyphCacheRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRGlyphCache(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRGlyphCacheCreate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphCacheCreate"), 1, &BindTRGlyphCacheCreate));
    target.setProperty(rt, "TRGlyphCacheGetDefault", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphCacheGetDefault"), 0, &BindTRGlyphCacheGetDefault));
    target.setProperty(rt, "TRGlyphCacheGetCapacity", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphCacheGetCapacity"), 1, &BindTRGlyphCacheGetCapacity));
    target.setProperty(rt, "TRGlyphCacheSetCapacity", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphCacheSetCapacity"), 2, &BindTRGlyphCacheSetCapacity));
    target.setProperty(rt, "TRGlyphCacheGetSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphCacheGetSize"), 1, &BindTRGlyphCacheGetSize));
    target.setProperty(rt, "TRGlyphCacheClear", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphCacheClear"), 1, &BindTRGlyphCacheClear));
    target.setProperty(rt, "TRGlyphCacheRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphCacheRetain"), 1, &BindTRGlyphCacheRetain));
}

} // namespace generated
} // namespace tehreer
