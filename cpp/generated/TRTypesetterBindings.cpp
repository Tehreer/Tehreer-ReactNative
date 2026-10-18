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

jsi::Value BindTRTypesetterGetCodeUnitCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterGetCodeUnitCount";
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterGetCodeUnitCount(a_typesetter);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypesetterSuggestForwardBreak(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterSuggestForwardBreak";
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");
    TRBreakMode a_breakMode = marshal::ToNumber<TRBreakMode>(rt, marshal::ArgAt(args, count, 4), kFunction, "breakMode");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterSuggestForwardBreak(a_typesetter, a_index, a_length, a_extent, a_breakMode);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypesetterSuggestBackwardBreak(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterSuggestBackwardBreak";
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");
    TRBreakMode a_breakMode = marshal::ToNumber<TRBreakMode>(rt, marshal::ArgAt(args, count, 4), kFunction, "breakMode");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterSuggestBackwardBreak(a_typesetter, a_index, a_length, a_extent, a_breakMode);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTypesetterCreateSimpleLine(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateSimpleLine";
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_layoutWidth = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "layoutWidth");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterCreateSimpleLine(a_typesetter, a_index, a_length, a_layoutWidth);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterCreateTruncationToken(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateTruncationToken";
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRTruncationPlace a_truncationPlace = marshal::ToNumber<TRTruncationPlace>(rt, marshal::ArgAt(args, count, 3), kFunction, "truncationPlace");
    TRUInteger a_tokenLength = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 5), kFunction, "tokenLength");
    TRStringEncoding a_tokenEncoding = marshal::ToNumber<TRStringEncoding>(rt, marshal::ArgAt(args, count, 6), kFunction, "tokenEncoding");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    marshal::ConstBuffer a_tokenString = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 4), kFunction, "tokenString", true);

    if (marshal::CodeUnitSize(a_tokenEncoding) != 0 && a_tokenString.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "tokenString", static_cast<size_t>(a_tokenLength), marshal::CodeUnitSize(a_tokenEncoding), a_tokenString.byteLength);
    }

    auto result = TRTypesetterCreateTruncationToken(a_typesetter, a_index, a_length, a_truncationPlace, a_tokenString.data, a_tokenLength, a_tokenEncoding);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterCreateTruncatedLine(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateTruncatedLine";
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");
    TRBreakMode a_breakMode = marshal::ToNumber<TRBreakMode>(rt, marshal::ArgAt(args, count, 4), kFunction, "breakMode");
    TRTruncationPlace a_truncationPlace = marshal::ToNumber<TRTruncationPlace>(rt, marshal::ArgAt(args, count, 5), kFunction, "truncationPlace");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    TRComposedLineRef a_tokenLine = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 6), kFunction, "tokenLine", false);

    auto result = TRTypesetterCreateTruncatedLine(a_typesetter, a_index, a_length, a_extent, a_breakMode, a_truncationPlace, a_tokenLine);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterCreateJustifiedLine(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateJustifiedLine";
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_justificationFactor = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "justificationFactor");
    TRFloat a_justificationExtent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 4), kFunction, "justificationExtent");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterCreateJustifiedLine(a_typesetter, a_index, a_length, a_justificationFactor, a_justificationExtent);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterRetain";
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterRetain(a_typesetter);
    return marshal::FromHandle<TRTypesetterRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRTypesetter(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRTypesetterGetCodeUnitCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterGetCodeUnitCount"), 1, &BindTRTypesetterGetCodeUnitCount));
    target.setProperty(rt, "TRTypesetterSuggestForwardBreak", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterSuggestForwardBreak"), 5, &BindTRTypesetterSuggestForwardBreak));
    target.setProperty(rt, "TRTypesetterSuggestBackwardBreak", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterSuggestBackwardBreak"), 5, &BindTRTypesetterSuggestBackwardBreak));
    target.setProperty(rt, "TRTypesetterCreateSimpleLine", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateSimpleLine"), 4, &BindTRTypesetterCreateSimpleLine));
    target.setProperty(rt, "TRTypesetterCreateTruncationToken", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateTruncationToken"), 7, &BindTRTypesetterCreateTruncationToken));
    target.setProperty(rt, "TRTypesetterCreateTruncatedLine", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateTruncatedLine"), 7, &BindTRTypesetterCreateTruncatedLine));
    target.setProperty(rt, "TRTypesetterCreateJustifiedLine", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateJustifiedLine"), 5, &BindTRTypesetterCreateJustifiedLine));
    target.setProperty(rt, "TRTypesetterRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterRetain"), 1, &BindTRTypesetterRetain));
}

} // namespace generated
} // namespace tehreer
