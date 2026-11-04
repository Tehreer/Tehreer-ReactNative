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

jsi::Value BindTRTypesetterCreateCopy(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateCopy";
    marshal::BeginCall();
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterCreateCopy(a_typesetter);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRTypesetterRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterCreateMutableCopy(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateMutableCopy";
    marshal::BeginCall();
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterCreateMutableCopy(a_typesetter);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRMutableTypesetterRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterGetEncoding(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterGetEncoding";
    marshal::BeginCall();
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterGetEncoding(a_typesetter);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRStringEncoding>(rt, result);
}

jsi::Value BindTRTypesetterGetLength(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterGetLength";
    marshal::BeginCall();
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterGetLength(a_typesetter);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRTypesetterGetCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterGetCodeUnits";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    marshal::MutableBuffer a_buffer = marshal::ToMutableBuffer(rt, marshal::ArgAt(args, count, 3), kFunction, "buffer", true);

    if (marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)) != 0 && a_buffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "buffer", static_cast<size_t>(a_length), marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)), a_buffer.byteLength);
    }

    auto result = TRTypesetterGetCodeUnits(a_typesetter, a_index, a_length, a_buffer.data);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypesetterCopyAttributes(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCopyAttributes";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger o_outLength = 0;
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterCopyAttributes(a_typesetter, a_index, &o_outLength);
    marshal::RethrowCallbackError(rt, result);
    jsi::Object object(rt);
    object.setProperty(rt, "result", marshal::FromHandle<TRAttributeListRef>(rt, result, marshal::Ownership::Adopt));
    object.setProperty(rt, "outLength", marshal::FromIndex(rt, o_outLength));
    return jsi::Value(std::move(object));
}

jsi::Value BindTRTypesetterBeginEditing(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterBeginEditing";
    marshal::BeginCall();
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    TRTypesetterBeginEditing(a_typesetter);
    marshal::RethrowCallbackError(rt);
    return jsi::Value::undefined();
}

jsi::Value BindTRTypesetterEndEditing(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterEndEditing";
    marshal::BeginCall();
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    TRTypesetterEndEditing(a_typesetter);
    marshal::RethrowCallbackError(rt);
    return jsi::Value::undefined();
}

jsi::Value BindTRTypesetterAppendCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterAppendCodeUnits";
    marshal::BeginCall();
    TRUInteger a_codeUnitCount = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "codeUnitCount");
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitBuffer", true);

    if (marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)) != 0 && a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTypesetterAppendCodeUnits(a_typesetter, a_codeUnitBuffer.data, a_codeUnitCount);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypesetterInsertCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterInsertCodeUnits";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_codeUnitCount = marshal::ToIndex(rt, marshal::ArgAt(args, count, 3), kFunction, "codeUnitCount");
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 2), kFunction, "codeUnitBuffer", true);

    if (marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)) != 0 && a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTypesetterInsertCodeUnits(a_typesetter, a_index, a_codeUnitBuffer.data, a_codeUnitCount);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypesetterDeleteCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterDeleteCodeUnits";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterDeleteCodeUnits(a_typesetter, a_index, a_length);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypesetterSetCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterSetCodeUnits";
    marshal::BeginCall();
    TRUInteger a_codeUnitCount = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "codeUnitCount");
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitBuffer", true);

    if (marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)) != 0 && a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTypesetterSetCodeUnits(a_typesetter, a_codeUnitBuffer.data, a_codeUnitCount);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypesetterReplaceCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterReplaceCodeUnits";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRUInteger a_codeUnitCount = marshal::ToIndex(rt, marshal::ArgAt(args, count, 4), kFunction, "codeUnitCount");
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 3), kFunction, "codeUnitBuffer", true);

    if (marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)) != 0 && a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTypesetterGetEncoding(a_typesetter)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTypesetterReplaceCodeUnits(a_typesetter, a_index, a_length, a_codeUnitBuffer.data, a_codeUnitCount);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypesetterRemoveAttribute(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterRemoveAttribute";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRAttributeType a_attributeType = marshal::ToNumber<TRAttributeType>(rt, marshal::ArgAt(args, count, 3), kFunction, "attributeType");
    TRMutableTypesetterRef a_typesetter = marshal::ToHandle<TRMutableTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterRemoveAttribute(a_typesetter, a_index, a_length, a_attributeType);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTypesetterSuggestForwardBreak(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterSuggestForwardBreak";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");
    TRBreakMode a_breakMode = marshal::ToNumber<TRBreakMode>(rt, marshal::ArgAt(args, count, 4), kFunction, "breakMode");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterSuggestForwardBreak(a_typesetter, a_index, a_length, a_extent, a_breakMode);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRTypesetterSuggestBackwardBreak(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterSuggestBackwardBreak";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");
    TRBreakMode a_breakMode = marshal::ToNumber<TRBreakMode>(rt, marshal::ArgAt(args, count, 4), kFunction, "breakMode");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterSuggestBackwardBreak(a_typesetter, a_index, a_length, a_extent, a_breakMode);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRTypesetterCreateSimpleLine(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateSimpleLine";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_layoutWidth = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "layoutWidth");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterCreateSimpleLine(a_typesetter, a_index, a_length, a_layoutWidth);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterCreateTruncationToken(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateTruncationToken";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRTruncationPlace a_truncationPlace = marshal::ToNumber<TRTruncationPlace>(rt, marshal::ArgAt(args, count, 3), kFunction, "truncationPlace");
    TRUInteger a_tokenLength = marshal::ToIndex(rt, marshal::ArgAt(args, count, 5), kFunction, "tokenLength");
    TRStringEncoding a_tokenEncoding = marshal::ToNumber<TRStringEncoding>(rt, marshal::ArgAt(args, count, 6), kFunction, "tokenEncoding");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    marshal::ConstBuffer a_tokenString = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 4), kFunction, "tokenString", true);

    if (marshal::CodeUnitSize(a_tokenEncoding) != 0 && a_tokenString.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "tokenString", static_cast<size_t>(a_tokenLength), marshal::CodeUnitSize(a_tokenEncoding), a_tokenString.byteLength);
    }

    auto result = TRTypesetterCreateTruncationToken(a_typesetter, a_index, a_length, a_truncationPlace, a_tokenString.data, a_tokenLength, a_tokenEncoding);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterCreateTruncatedLine(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateTruncatedLine";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_extent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "extent");
    TRBreakMode a_breakMode = marshal::ToNumber<TRBreakMode>(rt, marshal::ArgAt(args, count, 4), kFunction, "breakMode");
    TRTruncationPlace a_truncationPlace = marshal::ToNumber<TRTruncationPlace>(rt, marshal::ArgAt(args, count, 5), kFunction, "truncationPlace");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);
    TRComposedLineRef a_tokenLine = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 6), kFunction, "tokenLine", false);

    auto result = TRTypesetterCreateTruncatedLine(a_typesetter, a_index, a_length, a_extent, a_breakMode, a_truncationPlace, a_tokenLine);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterCreateJustifiedLine(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterCreateJustifiedLine";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRFloat a_justificationFactor = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 3), kFunction, "justificationFactor");
    TRFloat a_justificationExtent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 4), kFunction, "justificationExtent");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterCreateJustifiedLine(a_typesetter, a_index, a_length, a_justificationFactor, a_justificationExtent);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTypesetterFindBoundary(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterFindBoundary";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRBoundaryType a_type = marshal::ToNumber<TRBoundaryType>(rt, marshal::ArgAt(args, count, 2), kFunction, "type");
    TRBoundaryDirection a_direction = marshal::ToNumber<TRBoundaryDirection>(rt, marshal::ArgAt(args, count, 3), kFunction, "direction");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterFindBoundary(a_typesetter, a_index, a_type, a_direction);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRTypesetterGetBoundaryRange(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterGetBoundaryRange";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRBoundaryType a_type = marshal::ToNumber<TRBoundaryType>(rt, marshal::ArgAt(args, count, 2), kFunction, "type");
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterGetBoundaryRange(a_typesetter, a_index, a_type);
    marshal::RethrowCallbackError(rt);
    return TRRangeToJs(rt, result);
}

jsi::Value BindTRTypesetterRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTypesetterRetain";
    marshal::BeginCall();
    TRTypesetterRef a_typesetter = marshal::ToHandle<TRTypesetterRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "typesetter", false);

    auto result = TRTypesetterRetain(a_typesetter);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRTypesetterRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRTypesetter(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRTypesetterCreateCopy", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateCopy"), 1, &BindTRTypesetterCreateCopy));
    target.setProperty(rt, "TRTypesetterCreateMutableCopy", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateMutableCopy"), 1, &BindTRTypesetterCreateMutableCopy));
    target.setProperty(rt, "TRTypesetterGetEncoding", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterGetEncoding"), 1, &BindTRTypesetterGetEncoding));
    target.setProperty(rt, "TRTypesetterGetLength", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterGetLength"), 1, &BindTRTypesetterGetLength));
    target.setProperty(rt, "TRTypesetterGetCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterGetCodeUnits"), 4, &BindTRTypesetterGetCodeUnits));
    target.setProperty(rt, "TRTypesetterCopyAttributes", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCopyAttributes"), 2, &BindTRTypesetterCopyAttributes));
    target.setProperty(rt, "TRTypesetterBeginEditing", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterBeginEditing"), 1, &BindTRTypesetterBeginEditing));
    target.setProperty(rt, "TRTypesetterEndEditing", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterEndEditing"), 1, &BindTRTypesetterEndEditing));
    target.setProperty(rt, "TRTypesetterAppendCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterAppendCodeUnits"), 3, &BindTRTypesetterAppendCodeUnits));
    target.setProperty(rt, "TRTypesetterInsertCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterInsertCodeUnits"), 4, &BindTRTypesetterInsertCodeUnits));
    target.setProperty(rt, "TRTypesetterDeleteCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterDeleteCodeUnits"), 3, &BindTRTypesetterDeleteCodeUnits));
    target.setProperty(rt, "TRTypesetterSetCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterSetCodeUnits"), 3, &BindTRTypesetterSetCodeUnits));
    target.setProperty(rt, "TRTypesetterReplaceCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterReplaceCodeUnits"), 5, &BindTRTypesetterReplaceCodeUnits));
    target.setProperty(rt, "TRTypesetterRemoveAttribute", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterRemoveAttribute"), 4, &BindTRTypesetterRemoveAttribute));
    target.setProperty(rt, "TRTypesetterSuggestForwardBreak", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterSuggestForwardBreak"), 5, &BindTRTypesetterSuggestForwardBreak));
    target.setProperty(rt, "TRTypesetterSuggestBackwardBreak", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterSuggestBackwardBreak"), 5, &BindTRTypesetterSuggestBackwardBreak));
    target.setProperty(rt, "TRTypesetterCreateSimpleLine", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateSimpleLine"), 4, &BindTRTypesetterCreateSimpleLine));
    target.setProperty(rt, "TRTypesetterCreateTruncationToken", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateTruncationToken"), 7, &BindTRTypesetterCreateTruncationToken));
    target.setProperty(rt, "TRTypesetterCreateTruncatedLine", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateTruncatedLine"), 7, &BindTRTypesetterCreateTruncatedLine));
    target.setProperty(rt, "TRTypesetterCreateJustifiedLine", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterCreateJustifiedLine"), 5, &BindTRTypesetterCreateJustifiedLine));
    target.setProperty(rt, "TRTypesetterFindBoundary", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterFindBoundary"), 4, &BindTRTypesetterFindBoundary));
    target.setProperty(rt, "TRTypesetterGetBoundaryRange", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterGetBoundaryRange"), 3, &BindTRTypesetterGetBoundaryRange));
    target.setProperty(rt, "TRTypesetterRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTypesetterRetain"), 1, &BindTRTypesetterRetain));
}

} // namespace generated
} // namespace tehreer
