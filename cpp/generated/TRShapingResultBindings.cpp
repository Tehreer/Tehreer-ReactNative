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

jsi::Value BindTRShapingResultGetCodeUnitCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultGetCodeUnitCount";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultGetCodeUnitCount(a_result);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRShapingResultIsBackward(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultIsBackward";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultIsBackward(a_result);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRShapingResultIsRTL(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultIsRTL";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultIsRTL(a_result);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRShapingResultGetGlyphCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultGetGlyphCount";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultGetGlyphCount(a_result);
    return marshal::FromNumber<TRUInteger>(rt, result);
}

jsi::Value BindTRShapingResultGetGlyphIDsPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultGetGlyphIDsPtr";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultGetGlyphIDsPtr(a_result);
    return marshal::MakePointerView(rt, result, "TRGlyphID", sizeof(TRGlyphID), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRShapingResultGetGlyphOffsetsPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultGetGlyphOffsetsPtr";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultGetGlyphOffsetsPtr(a_result);
    return marshal::MakePointerView(rt, result, "TRPoint", sizeof(TRPoint), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRShapingResultGetGlyphAdvancesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultGetGlyphAdvancesPtr";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultGetGlyphAdvancesPtr(a_result);
    return marshal::MakePointerView(rt, result, "TRFloat", sizeof(TRFloat), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRShapingResultGetClusterMapPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultGetClusterMapPtr";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultGetClusterMapPtr(a_result);
    return marshal::MakePointerView(rt, result, "TRUInteger", sizeof(TRUInteger), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRShapingResultGetCaretEdges(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultGetCaretEdges";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);
    marshal::ConstBuffer a_caretStops = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "caretStops", true);
    marshal::MutableBuffer a_caretEdges = marshal::ToMutableBuffer(rt, marshal::ArgAt(args, count, 2), kFunction, "caretEdges", false);

    if (a_caretStops.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "caretStops", static_cast<size_t>(TRShapingResultGetCodeUnitCount(a_result)), sizeof(TRBoolean), a_caretStops.byteLength);
    }
    if (a_caretEdges.data != nullptr) {
        marshal::RequireCapacity(rt, kFunction, "caretEdges", static_cast<size_t>(TRShapingResultGetCodeUnitCount(a_result) + 1), sizeof(TRFloat), a_caretEdges.byteLength);
    }

    TRShapingResultGetCaretEdges(a_result, static_cast<const TRBoolean *>(a_caretStops.data), static_cast<TRFloat *>(a_caretEdges.data));
    return jsi::Value::undefined();
}

jsi::Value BindTRShapingResultRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRShapingResultRetain";
    TRShapingResultRef a_result = marshal::ToHandle<TRShapingResultRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "result", false);

    auto result = TRShapingResultRetain(a_result);
    return marshal::FromHandle<TRShapingResultRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRShapingResult(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRShapingResultGetCodeUnitCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultGetCodeUnitCount"), 1, &BindTRShapingResultGetCodeUnitCount));
    target.setProperty(rt, "TRShapingResultIsBackward", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultIsBackward"), 1, &BindTRShapingResultIsBackward));
    target.setProperty(rt, "TRShapingResultIsRTL", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultIsRTL"), 1, &BindTRShapingResultIsRTL));
    target.setProperty(rt, "TRShapingResultGetGlyphCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultGetGlyphCount"), 1, &BindTRShapingResultGetGlyphCount));
    target.setProperty(rt, "TRShapingResultGetGlyphIDsPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultGetGlyphIDsPtr"), 1, &BindTRShapingResultGetGlyphIDsPtr));
    target.setProperty(rt, "TRShapingResultGetGlyphOffsetsPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultGetGlyphOffsetsPtr"), 1, &BindTRShapingResultGetGlyphOffsetsPtr));
    target.setProperty(rt, "TRShapingResultGetGlyphAdvancesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultGetGlyphAdvancesPtr"), 1, &BindTRShapingResultGetGlyphAdvancesPtr));
    target.setProperty(rt, "TRShapingResultGetClusterMapPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultGetClusterMapPtr"), 1, &BindTRShapingResultGetClusterMapPtr));
    target.setProperty(rt, "TRShapingResultGetCaretEdges", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultGetCaretEdges"), 3, &BindTRShapingResultGetCaretEdges));
    target.setProperty(rt, "TRShapingResultRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRShapingResultRetain"), 1, &BindTRShapingResultRetain));
}

} // namespace generated
} // namespace tehreer
