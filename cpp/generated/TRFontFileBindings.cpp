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

jsi::Value BindTRFontFileCreateFromPath(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFileCreateFromPath";
    marshal::CStringArg a_path = marshal::ToCString(rt, marshal::ArgAt(args, count, 0), kFunction, "path", false);

    auto result = TRFontFileCreateFromPath(a_path.get());
    return marshal::FromHandle<TRFontFileRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRFontFileCreateFromMemory(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFileCreateFromMemory";
    TRUInteger a_size = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "size");
    marshal::ConstBuffer a_memory = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 0), kFunction, "memory", false);

    marshal::RequireCapacity(rt, kFunction, "memory", static_cast<size_t>(a_size), 1, a_memory.byteLength);

    auto result = TRFontFileCreateFromMemory(a_memory.data, a_size);
    return marshal::FromHandle<TRFontFileRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRFontFileGetTypefaceCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFileGetTypefaceCount";
    TRFontFileRef a_fontFile = marshal::ToHandle<TRFontFileRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "fontFile", false);

    auto result = TRFontFileGetTypefaceCount(a_fontFile);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRFontFileGetTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFileGetTypeface";
    TRFontFileRef a_fontFile = marshal::ToHandle<TRFontFileRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "fontFile", false);
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");

    auto result = TRFontFileGetTypeface(a_fontFile, a_index);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRFontFileRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRFontFileRetain";
    TRFontFileRef a_fontFile = marshal::ToHandle<TRFontFileRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "fontFile", false);

    auto result = TRFontFileRetain(a_fontFile);
    return marshal::FromHandle<TRFontFileRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRFontFile(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRFontFileCreateFromPath", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFileCreateFromPath"), 1, &BindTRFontFileCreateFromPath));
    target.setProperty(rt, "TRFontFileCreateFromMemory", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFileCreateFromMemory"), 2, &BindTRFontFileCreateFromMemory));
    target.setProperty(rt, "TRFontFileGetTypefaceCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFileGetTypefaceCount"), 1, &BindTRFontFileGetTypefaceCount));
    target.setProperty(rt, "TRFontFileGetTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFileGetTypeface"), 2, &BindTRFontFileGetTypeface));
    target.setProperty(rt, "TRFontFileRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRFontFileRetain"), 1, &BindTRFontFileRetain));
}

} // namespace generated
} // namespace tehreer
