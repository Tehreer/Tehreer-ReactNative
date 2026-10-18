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

jsi::Value BindTRTextCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextCreate";
    marshal::ConstBuffer a_string = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 0), kFunction, "string", false);
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "length");
    TRStringEncoding a_encoding = marshal::ToNumber<TRStringEncoding>(rt, marshal::ArgAt(args, count, 2), kFunction, "encoding");

    if (a_string.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "string", static_cast<size_t>(a_length), marshal::CodeUnitSize(a_encoding), a_string.byteLength);
    }

    auto result = TRTextCreate(a_string.data, a_length, a_encoding);
    return marshal::FromHandle<TRTextRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTextCreateCopy(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextCreateCopy";
    TRTextRef a_text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    auto result = TRTextCreateCopy(a_text);
    return marshal::FromHandle<TRTextRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTextCreateMutableCopy(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextCreateMutableCopy";
    TRTextRef a_text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    auto result = TRTextCreateMutableCopy(a_text);
    return marshal::FromHandle<TRMutableTextRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTextGetEncoding(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextGetEncoding";
    TRTextRef a_text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    auto result = TRTextGetEncoding(a_text);
    return marshal::FromNumber<TRStringEncoding>(rt, result);
}

jsi::Value BindTRTextGetLength(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextGetLength";
    TRTextRef a_text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    auto result = TRTextGetLength(a_text);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRTextGetCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextGetCodeUnits";
    TRTextRef a_text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    marshal::MutableBuffer a_buffer = marshal::ToMutableBuffer(rt, marshal::ArgAt(args, count, 3), kFunction, "buffer", false);

    if (a_buffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "buffer", static_cast<size_t>(a_length), marshal::CodeUnitSize(TRTextGetEncoding(a_text)), a_buffer.byteLength);
    }

    auto result = TRTextGetCodeUnits(a_text, a_index, a_length, a_buffer.data);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTextCopyAttributes(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextCopyAttributes";
    TRTextRef a_text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger o_outLength = 0;

    auto result = TRTextCopyAttributes(a_text, a_index, &o_outLength);
    jsi::Object object(rt);
    object.setProperty(rt, "result", marshal::FromHandle<TRAttributeListRef>(rt, result, marshal::Ownership::Adopt));
    object.setProperty(rt, "outLength", marshal::FromNumber<TRUInteger>(rt, o_outLength));
    return jsi::Value(std::move(object));
}

jsi::Value BindTRTextRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextRetain";
    TRTextRef a_text = marshal::ToHandle<TRTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    auto result = TRTextRetain(a_text);
    return marshal::FromHandle<TRTextRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTextCreateMutable(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextCreateMutable";
    TRStringEncoding a_encoding = marshal::ToNumber<TRStringEncoding>(rt, marshal::ArgAt(args, count, 0), kFunction, "encoding");

    auto result = TRTextCreateMutable(a_encoding);
    return marshal::FromHandle<TRMutableTextRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRTextBeginEditing(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextBeginEditing";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    TRTextBeginEditing(a_text);
    return jsi::Value::undefined();
}

jsi::Value BindTRTextEndEditing(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextEndEditing";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);

    TRTextEndEditing(a_text);
    return jsi::Value::undefined();
}

jsi::Value BindTRTextAppendCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextAppendCodeUnits";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitBuffer", false);
    TRUInteger a_codeUnitCount = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "codeUnitCount");

    if (a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTextGetEncoding(a_text)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTextAppendCodeUnits(a_text, a_codeUnitBuffer.data, a_codeUnitCount);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTextInsertCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextInsertCodeUnits";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 2), kFunction, "codeUnitBuffer", false);
    TRUInteger a_codeUnitCount = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 3), kFunction, "codeUnitCount");

    if (a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTextGetEncoding(a_text)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTextInsertCodeUnits(a_text, a_index, a_codeUnitBuffer.data, a_codeUnitCount);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTextDeleteCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextDeleteCodeUnits";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");

    auto result = TRTextDeleteCodeUnits(a_text, a_index, a_length);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTextSetCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextSetCodeUnits";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitBuffer", false);
    TRUInteger a_codeUnitCount = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "codeUnitCount");

    if (a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTextGetEncoding(a_text)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTextSetCodeUnits(a_text, a_codeUnitBuffer.data, a_codeUnitCount);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTextReplaceCodeUnits(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextReplaceCodeUnits";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    marshal::ConstBuffer a_codeUnitBuffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 3), kFunction, "codeUnitBuffer", true);
    TRUInteger a_codeUnitCount = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 4), kFunction, "codeUnitCount");

    if (a_codeUnitBuffer.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "codeUnitBuffer", static_cast<size_t>(a_codeUnitCount), marshal::CodeUnitSize(TRTextGetEncoding(a_text)), a_codeUnitBuffer.byteLength);
    }

    auto result = TRTextReplaceCodeUnits(a_text, a_index, a_length, a_codeUnitBuffer.data, a_codeUnitCount);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRTextRemoveAttribute(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRTextRemoveAttribute";
    TRMutableTextRef a_text = marshal::ToHandle<TRMutableTextRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "text", false);
    TRUInteger a_index = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToNumber<TRUInteger>(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    TRAttributeType a_attributeType = marshal::ToNumber<TRAttributeType>(rt, marshal::ArgAt(args, count, 3), kFunction, "attributeType");

    auto result = TRTextRemoveAttribute(a_text, a_index, a_length, a_attributeType);
    return marshal::FromBoolean(result != 0);
}

} // namespace

void InstallTRText(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRTextCreate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextCreate"), 3, &BindTRTextCreate));
    target.setProperty(rt, "TRTextCreateCopy", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextCreateCopy"), 1, &BindTRTextCreateCopy));
    target.setProperty(rt, "TRTextCreateMutableCopy", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextCreateMutableCopy"), 1, &BindTRTextCreateMutableCopy));
    target.setProperty(rt, "TRTextGetEncoding", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextGetEncoding"), 1, &BindTRTextGetEncoding));
    target.setProperty(rt, "TRTextGetLength", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextGetLength"), 1, &BindTRTextGetLength));
    target.setProperty(rt, "TRTextGetCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextGetCodeUnits"), 4, &BindTRTextGetCodeUnits));
    target.setProperty(rt, "TRTextCopyAttributes", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextCopyAttributes"), 2, &BindTRTextCopyAttributes));
    target.setProperty(rt, "TRTextRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextRetain"), 1, &BindTRTextRetain));
    target.setProperty(rt, "TRTextCreateMutable", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextCreateMutable"), 1, &BindTRTextCreateMutable));
    target.setProperty(rt, "TRTextBeginEditing", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextBeginEditing"), 1, &BindTRTextBeginEditing));
    target.setProperty(rt, "TRTextEndEditing", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextEndEditing"), 1, &BindTRTextEndEditing));
    target.setProperty(rt, "TRTextAppendCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextAppendCodeUnits"), 3, &BindTRTextAppendCodeUnits));
    target.setProperty(rt, "TRTextInsertCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextInsertCodeUnits"), 4, &BindTRTextInsertCodeUnits));
    target.setProperty(rt, "TRTextDeleteCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextDeleteCodeUnits"), 3, &BindTRTextDeleteCodeUnits));
    target.setProperty(rt, "TRTextSetCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextSetCodeUnits"), 3, &BindTRTextSetCodeUnits));
    target.setProperty(rt, "TRTextReplaceCodeUnits", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextReplaceCodeUnits"), 5, &BindTRTextReplaceCodeUnits));
    target.setProperty(rt, "TRTextRemoveAttribute", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRTextRemoveAttribute"), 4, &BindTRTextRemoveAttribute));
}

} // namespace generated
} // namespace tehreer
