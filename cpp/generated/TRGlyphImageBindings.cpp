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

jsi::Value BindTRGlyphImageGetFormat(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageGetFormat";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageGetFormat(a_image);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRGlyphImageFormat>(rt, result);
}

jsi::Value BindTRGlyphImageGetLeft(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageGetLeft";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageGetLeft(a_image);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRGlyphImageGetTop(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageGetTop";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageGetTop(a_image);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRInt32>(rt, result);
}

jsi::Value BindTRGlyphImageGetWidth(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageGetWidth";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageGetWidth(a_image);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRUInt32>(rt, result);
}

jsi::Value BindTRGlyphImageGetHeight(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageGetHeight";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageGetHeight(a_image);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRUInt32>(rt, result);
}

jsi::Value BindTRGlyphImageGetPixelsPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageGetPixelsPtr";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageGetPixelsPtr(a_image);
    marshal::RethrowCallbackError(rt);
    return marshal::MakePointerView(rt, result, "TRUInt8", sizeof(TRUInt8), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRGlyphImageGetByteCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageGetByteCount";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageGetByteCount(a_image);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphImageRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphImageRetain";
    TRGlyphImageRef a_image = marshal::ToHandle<TRGlyphImageRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "image", false);

    auto result = TRGlyphImageRetain(a_image);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRGlyphImageRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRGlyphImage(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRGlyphImageGetFormat", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageGetFormat"), 1, &BindTRGlyphImageGetFormat));
    target.setProperty(rt, "TRGlyphImageGetLeft", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageGetLeft"), 1, &BindTRGlyphImageGetLeft));
    target.setProperty(rt, "TRGlyphImageGetTop", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageGetTop"), 1, &BindTRGlyphImageGetTop));
    target.setProperty(rt, "TRGlyphImageGetWidth", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageGetWidth"), 1, &BindTRGlyphImageGetWidth));
    target.setProperty(rt, "TRGlyphImageGetHeight", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageGetHeight"), 1, &BindTRGlyphImageGetHeight));
    target.setProperty(rt, "TRGlyphImageGetPixelsPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageGetPixelsPtr"), 1, &BindTRGlyphImageGetPixelsPtr));
    target.setProperty(rt, "TRGlyphImageGetByteCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageGetByteCount"), 1, &BindTRGlyphImageGetByteCount));
    target.setProperty(rt, "TRGlyphImageRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphImageRetain"), 1, &BindTRGlyphImageRetain));
}

} // namespace generated
} // namespace tehreer
