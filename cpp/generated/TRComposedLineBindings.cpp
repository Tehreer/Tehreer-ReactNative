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

void CollectTRComposedLineEnumerateVisualEdges_func(void *userData, TRFloat left, TRFloat right, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "left", marshal::FromNumber<TRFloat>(rt, left));
        object.setProperty(rt, "right", marshal::FromNumber<TRFloat>(rt, right));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

jsi::Value BindTRComposedLineGetStartIndex(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetStartIndex";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetStartIndex(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedLineGetEndIndex(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetEndIndex";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetEndIndex(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedLineGetParagraphLevel(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetParagraphLevel";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetParagraphLevel(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRUInt8>(rt, result);
}

jsi::Value BindTRComposedLineGetOrigin(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetOrigin";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetOrigin(a_line);
    marshal::RethrowCallbackError(rt);
    return TRPointToJs(rt, result);
}

jsi::Value BindTRComposedLineGetAscent(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetAscent";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetAscent(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedLineGetDescent(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetDescent";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetDescent(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedLineGetLeading(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetLeading";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetLeading(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedLineGetWidth(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetWidth";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetWidth(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedLineGetHeight(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetHeight";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetHeight(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedLineGetTrailingWhitespaceExtent(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetTrailingWhitespaceExtent";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetTrailingWhitespaceExtent(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedLineIsBlock(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineIsBlock";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineIsBlock(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRComposedLineIsTruncated(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineIsTruncated";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineIsTruncated(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRComposedLineGetGlyphRunCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetGlyphRunCount";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetGlyphRunCount(a_line);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedLineGetGlyphRun(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetGlyphRun";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetGlyphRun(a_line, a_index);
    marshal::RethrowCallbackError(rt);
    return marshal::FromHandle<TRGlyphRunRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRComposedLineGetCodeUnitDistance(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetCodeUnitDistance";
    marshal::BeginCall();
    TRUInteger a_codeUnitIndex = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitIndex");
    TRFloat o_distance = 0;
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetCodeUnitDistance(a_line, a_codeUnitIndex, &o_distance);
    marshal::RethrowCallbackError(rt);
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return marshal::FromNumber<TRFloat>(rt, o_distance);
}

jsi::Value BindTRComposedLineEnumerateVisualEdges(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineEnumerateVisualEdges";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    marshal::Collector collector(rt);
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineEnumerateVisualEdges(a_line, a_index, a_length, CollectTRComposedLineEnumerateVisualEdges_func, &collector);
    marshal::RethrowCallbackError(rt);
    jsi::Value items = collector.Finish();
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return items;
}

jsi::Value BindTRComposedLineGetCodeUnitIndexAtDistance(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetCodeUnitIndexAtDistance";
    marshal::BeginCall();
    TRFloat a_distance = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "distance");
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetCodeUnitIndexAtDistance(a_line, a_distance);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedLineGetClusterStartAtDistance(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetClusterStartAtDistance";
    marshal::BeginCall();
    TRFloat a_distance = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "distance");
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetClusterStartAtDistance(a_line, a_distance);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedLineGetPenOffset(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineGetPenOffset";
    marshal::BeginCall();
    TRFloat a_flushFactor = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "flushFactor");
    TRFloat a_flushExtent = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 2), kFunction, "flushExtent");
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineGetPenOffset(a_line, a_flushFactor, a_flushExtent);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedLineComputeInkBox(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineComputeInkBox";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", false);

    auto result = TRComposedLineComputeInkBox(a_line, a_renderer);
    marshal::RethrowCallbackError(rt);
    return TRRectToJs(rt, result);
}

jsi::Value BindTRComposedLineDraw(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineDraw";
    marshal::BeginCall();
    TRPoint a_origin = TRPointFromJs(rt, marshal::ArgAt(args, count, 2), kFunction, "origin");
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", true);

    TRComposedLineDraw(a_line, a_renderer, a_origin);
    marshal::RethrowCallbackError(rt);
    return jsi::Value::undefined();
}

jsi::Value BindTRComposedLineRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedLineRetain";
    marshal::BeginCall();
    TRComposedLineRef a_line = marshal::ToHandle<TRComposedLineRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "line", false);

    auto result = TRComposedLineRetain(a_line);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRComposedLine(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRComposedLineGetStartIndex", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetStartIndex"), 1, &BindTRComposedLineGetStartIndex));
    target.setProperty(rt, "TRComposedLineGetEndIndex", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetEndIndex"), 1, &BindTRComposedLineGetEndIndex));
    target.setProperty(rt, "TRComposedLineGetParagraphLevel", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetParagraphLevel"), 1, &BindTRComposedLineGetParagraphLevel));
    target.setProperty(rt, "TRComposedLineGetOrigin", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetOrigin"), 1, &BindTRComposedLineGetOrigin));
    target.setProperty(rt, "TRComposedLineGetAscent", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetAscent"), 1, &BindTRComposedLineGetAscent));
    target.setProperty(rt, "TRComposedLineGetDescent", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetDescent"), 1, &BindTRComposedLineGetDescent));
    target.setProperty(rt, "TRComposedLineGetLeading", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetLeading"), 1, &BindTRComposedLineGetLeading));
    target.setProperty(rt, "TRComposedLineGetWidth", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetWidth"), 1, &BindTRComposedLineGetWidth));
    target.setProperty(rt, "TRComposedLineGetHeight", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetHeight"), 1, &BindTRComposedLineGetHeight));
    target.setProperty(rt, "TRComposedLineGetTrailingWhitespaceExtent", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetTrailingWhitespaceExtent"), 1, &BindTRComposedLineGetTrailingWhitespaceExtent));
    target.setProperty(rt, "TRComposedLineIsBlock", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineIsBlock"), 1, &BindTRComposedLineIsBlock));
    target.setProperty(rt, "TRComposedLineIsTruncated", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineIsTruncated"), 1, &BindTRComposedLineIsTruncated));
    target.setProperty(rt, "TRComposedLineGetGlyphRunCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetGlyphRunCount"), 1, &BindTRComposedLineGetGlyphRunCount));
    target.setProperty(rt, "TRComposedLineGetGlyphRun", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetGlyphRun"), 2, &BindTRComposedLineGetGlyphRun));
    target.setProperty(rt, "TRComposedLineGetCodeUnitDistance", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetCodeUnitDistance"), 2, &BindTRComposedLineGetCodeUnitDistance));
    target.setProperty(rt, "TRComposedLineEnumerateVisualEdges", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineEnumerateVisualEdges"), 3, &BindTRComposedLineEnumerateVisualEdges));
    target.setProperty(rt, "TRComposedLineGetCodeUnitIndexAtDistance", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetCodeUnitIndexAtDistance"), 2, &BindTRComposedLineGetCodeUnitIndexAtDistance));
    target.setProperty(rt, "TRComposedLineGetClusterStartAtDistance", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetClusterStartAtDistance"), 2, &BindTRComposedLineGetClusterStartAtDistance));
    target.setProperty(rt, "TRComposedLineGetPenOffset", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineGetPenOffset"), 3, &BindTRComposedLineGetPenOffset));
    target.setProperty(rt, "TRComposedLineComputeInkBox", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineComputeInkBox"), 2, &BindTRComposedLineComputeInkBox));
    target.setProperty(rt, "TRComposedLineDraw", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineDraw"), 3, &BindTRComposedLineDraw));
    target.setProperty(rt, "TRComposedLineRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedLineRetain"), 1, &BindTRComposedLineRetain));
}

} // namespace generated
} // namespace tehreer
