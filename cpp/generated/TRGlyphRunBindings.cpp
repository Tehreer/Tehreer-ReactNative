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

jsi::Value BindTRGlyphRunGetStartIndex(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetStartIndex";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetStartIndex(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetEndIndex(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetEndIndex";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetEndIndex(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetStartExtraLength(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetStartExtraLength";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetStartExtraLength(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetEndExtraLength(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetEndExtraLength";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetEndExtraLength(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetBidiLevel(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetBidiLevel";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetBidiLevel(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRUInt8>(rt, result);
}

jsi::Value BindTRGlyphRunGetWritingDirection(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetWritingDirection";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetWritingDirection(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRWritingDirection>(rt, result);
}

jsi::Value BindTRGlyphRunIsBackward(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunIsBackward";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunIsBackward(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRGlyphRunGetTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetTypeface";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetTypeface(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRGlyphRunGetTypeSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetTypeSize";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetTypeSize(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetScaleX(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetScaleX";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetScaleX(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetScaleY(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetScaleY";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetScaleY(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetReplacement(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetReplacement";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetReplacement(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromHandle<TRReplacementRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRGlyphRunGetForegroundColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetForegroundColor";
    marshal::BeginCall();
    TRColor o_foregroundColor = 0;
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetForegroundColor(a_run, &o_foregroundColor);
    marshal::RethrowCallbackError(rt);
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return marshal::FromNumber<TRColor>(rt, o_foregroundColor);
}

jsi::Value BindTRGlyphRunGetBackgroundColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetBackgroundColor";
    marshal::BeginCall();
    TRColor o_backgroundColor = 0;
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetBackgroundColor(a_run, &o_backgroundColor);
    marshal::RethrowCallbackError(rt);
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return marshal::FromNumber<TRColor>(rt, o_backgroundColor);
}

jsi::Value BindTRGlyphRunHasUnderline(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunHasUnderline";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunHasUnderline(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRGlyphRunHasStrikethrough(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunHasStrikethrough";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunHasStrikethrough(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRGlyphRunGetDecorationColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetDecorationColor";
    marshal::BeginCall();
    TRColor o_decorationColor = 0;
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetDecorationColor(a_run, &o_decorationColor);
    marshal::RethrowCallbackError(rt);
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return marshal::FromNumber<TRColor>(rt, o_decorationColor);
}

jsi::Value BindTRGlyphRunGetUserData(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetUserData";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetUserData(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromToken(rt, result);
}

jsi::Value BindTRGlyphRunGetAscent(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetAscent";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetAscent(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetDescent(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetDescent";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetDescent(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetLeading(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetLeading";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetLeading(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetOrigin(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetOrigin";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetOrigin(a_run);
    marshal::RethrowCallbackError(rt);
    return TRPointToJs(rt, result);
}

jsi::Value BindTRGlyphRunGetWidth(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetWidth";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetWidth(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetHeight(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetHeight";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetHeight(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRGlyphRunGetGlyphCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetGlyphCount";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetGlyphCount(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetGlyphIDsPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetGlyphIDsPtr";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetGlyphIDsPtr(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::MakePointerView(rt, result, "TRGlyphID", sizeof(TRGlyphID), static_cast<size_t>(TRGlyphRunGetGlyphCount(a_run)), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRGlyphRunGetGlyphOffsetsPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetGlyphOffsetsPtr";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetGlyphOffsetsPtr(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::MakePointerView(rt, result, "TRPoint", sizeof(TRPoint), static_cast<size_t>(TRGlyphRunGetGlyphCount(a_run)), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRGlyphRunGetGlyphAdvancesPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetGlyphAdvancesPtr";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetGlyphAdvancesPtr(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::MakePointerView(rt, result, "TRFloat", sizeof(TRFloat), static_cast<size_t>(TRGlyphRunGetGlyphCount(a_run)), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRGlyphRunGetClusterMapPtr(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetClusterMapPtr";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetClusterMapPtr(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::MakePointerView(rt, result, "TRUInteger", sizeof(TRUInteger), static_cast<size_t>(TRGlyphRunGetClusterMapCount(a_run)), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRGlyphRunGetClusterMapCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetClusterMapCount";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetClusterMapCount(a_run);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetClusterStart(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetClusterStart";
    marshal::BeginCall();
    TRUInteger a_codeUnitIndex = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitIndex");
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetClusterStart(a_run, a_codeUnitIndex);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetClusterEnd(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetClusterEnd";
    marshal::BeginCall();
    TRUInteger a_codeUnitIndex = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitIndex");
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetClusterEnd(a_run, a_codeUnitIndex);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunGetCodeUnitDistance(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetCodeUnitDistance";
    marshal::BeginCall();
    TRUInteger a_codeUnitIndex = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitIndex");
    TRFloat o_distance = 0;
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetCodeUnitDistance(a_run, a_codeUnitIndex, &o_distance);
    marshal::RethrowCallbackError(rt);
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return marshal::FromNumber<TRFloat>(rt, o_distance);
}

jsi::Value BindTRGlyphRunGetCodeUnitIndexAtDistance(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunGetCodeUnitIndexAtDistance";
    marshal::BeginCall();
    TRFloat a_distance = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "distance");
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunGetCodeUnitIndexAtDistance(a_run, a_distance);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRGlyphRunComputeInkBox(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunComputeInkBox";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", true);

    auto result = TRGlyphRunComputeInkBox(a_run, a_renderer);
    marshal::RethrowCallbackError(rt);
    return TRRectToJs(rt, result);
}

jsi::Value BindTRGlyphRunDraw(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunDraw";
    marshal::BeginCall();
    TRPoint a_origin = TRPointFromJs(rt, marshal::ArgAt(args, count, 2), kFunction, "origin");
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", true);

    TRGlyphRunDraw(a_run, a_renderer, a_origin);
    marshal::RethrowCallbackError(rt);
    return jsi::Value::undefined();
}

jsi::Value BindTRGlyphRunRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRGlyphRunRetain";
    marshal::BeginCall();
    TRGlyphRunRef a_run = marshal::ToHandle<TRGlyphRunRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "run", false);

    auto result = TRGlyphRunRetain(a_run);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRGlyphRunRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRGlyphRun(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRGlyphRunGetStartIndex", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetStartIndex"), 1, &BindTRGlyphRunGetStartIndex));
    target.setProperty(rt, "TRGlyphRunGetEndIndex", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetEndIndex"), 1, &BindTRGlyphRunGetEndIndex));
    target.setProperty(rt, "TRGlyphRunGetStartExtraLength", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetStartExtraLength"), 1, &BindTRGlyphRunGetStartExtraLength));
    target.setProperty(rt, "TRGlyphRunGetEndExtraLength", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetEndExtraLength"), 1, &BindTRGlyphRunGetEndExtraLength));
    target.setProperty(rt, "TRGlyphRunGetBidiLevel", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetBidiLevel"), 1, &BindTRGlyphRunGetBidiLevel));
    target.setProperty(rt, "TRGlyphRunGetWritingDirection", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetWritingDirection"), 1, &BindTRGlyphRunGetWritingDirection));
    target.setProperty(rt, "TRGlyphRunIsBackward", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunIsBackward"), 1, &BindTRGlyphRunIsBackward));
    target.setProperty(rt, "TRGlyphRunGetTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetTypeface"), 1, &BindTRGlyphRunGetTypeface));
    target.setProperty(rt, "TRGlyphRunGetTypeSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetTypeSize"), 1, &BindTRGlyphRunGetTypeSize));
    target.setProperty(rt, "TRGlyphRunGetScaleX", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetScaleX"), 1, &BindTRGlyphRunGetScaleX));
    target.setProperty(rt, "TRGlyphRunGetScaleY", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetScaleY"), 1, &BindTRGlyphRunGetScaleY));
    target.setProperty(rt, "TRGlyphRunGetReplacement", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetReplacement"), 1, &BindTRGlyphRunGetReplacement));
    target.setProperty(rt, "TRGlyphRunGetForegroundColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetForegroundColor"), 1, &BindTRGlyphRunGetForegroundColor));
    target.setProperty(rt, "TRGlyphRunGetBackgroundColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetBackgroundColor"), 1, &BindTRGlyphRunGetBackgroundColor));
    target.setProperty(rt, "TRGlyphRunHasUnderline", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunHasUnderline"), 1, &BindTRGlyphRunHasUnderline));
    target.setProperty(rt, "TRGlyphRunHasStrikethrough", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunHasStrikethrough"), 1, &BindTRGlyphRunHasStrikethrough));
    target.setProperty(rt, "TRGlyphRunGetDecorationColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetDecorationColor"), 1, &BindTRGlyphRunGetDecorationColor));
    target.setProperty(rt, "TRGlyphRunGetUserData", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetUserData"), 1, &BindTRGlyphRunGetUserData));
    target.setProperty(rt, "TRGlyphRunGetAscent", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetAscent"), 1, &BindTRGlyphRunGetAscent));
    target.setProperty(rt, "TRGlyphRunGetDescent", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetDescent"), 1, &BindTRGlyphRunGetDescent));
    target.setProperty(rt, "TRGlyphRunGetLeading", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetLeading"), 1, &BindTRGlyphRunGetLeading));
    target.setProperty(rt, "TRGlyphRunGetOrigin", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetOrigin"), 1, &BindTRGlyphRunGetOrigin));
    target.setProperty(rt, "TRGlyphRunGetWidth", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetWidth"), 1, &BindTRGlyphRunGetWidth));
    target.setProperty(rt, "TRGlyphRunGetHeight", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetHeight"), 1, &BindTRGlyphRunGetHeight));
    target.setProperty(rt, "TRGlyphRunGetGlyphCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetGlyphCount"), 1, &BindTRGlyphRunGetGlyphCount));
    target.setProperty(rt, "TRGlyphRunGetGlyphIDsPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetGlyphIDsPtr"), 1, &BindTRGlyphRunGetGlyphIDsPtr));
    target.setProperty(rt, "TRGlyphRunGetGlyphOffsetsPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetGlyphOffsetsPtr"), 1, &BindTRGlyphRunGetGlyphOffsetsPtr));
    target.setProperty(rt, "TRGlyphRunGetGlyphAdvancesPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetGlyphAdvancesPtr"), 1, &BindTRGlyphRunGetGlyphAdvancesPtr));
    target.setProperty(rt, "TRGlyphRunGetClusterMapPtr", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetClusterMapPtr"), 1, &BindTRGlyphRunGetClusterMapPtr));
    target.setProperty(rt, "TRGlyphRunGetClusterMapCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetClusterMapCount"), 1, &BindTRGlyphRunGetClusterMapCount));
    target.setProperty(rt, "TRGlyphRunGetClusterStart", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetClusterStart"), 2, &BindTRGlyphRunGetClusterStart));
    target.setProperty(rt, "TRGlyphRunGetClusterEnd", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetClusterEnd"), 2, &BindTRGlyphRunGetClusterEnd));
    target.setProperty(rt, "TRGlyphRunGetCodeUnitDistance", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetCodeUnitDistance"), 2, &BindTRGlyphRunGetCodeUnitDistance));
    target.setProperty(rt, "TRGlyphRunGetCodeUnitIndexAtDistance", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunGetCodeUnitIndexAtDistance"), 2, &BindTRGlyphRunGetCodeUnitIndexAtDistance));
    target.setProperty(rt, "TRGlyphRunComputeInkBox", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunComputeInkBox"), 2, &BindTRGlyphRunComputeInkBox));
    target.setProperty(rt, "TRGlyphRunDraw", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunDraw"), 3, &BindTRGlyphRunDraw));
    target.setProperty(rt, "TRGlyphRunRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRGlyphRunRetain"), 1, &BindTRGlyphRunRetain));
}

} // namespace generated
} // namespace tehreer
