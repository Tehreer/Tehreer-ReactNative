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

void CollectTRComposedFrameEnumerateSelection_func(void *userData, TRRect rect, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Value item = TRRectToJs(rt, rect);
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

jsi::Value BindTRComposedFrameGetStartIndex(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetStartIndex";
    marshal::BeginCall();
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetStartIndex(a_frame);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedFrameGetEndIndex(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetEndIndex";
    marshal::BeginCall();
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetEndIndex(a_frame);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedFrameGetWidth(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetWidth";
    marshal::BeginCall();
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetWidth(a_frame);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedFrameGetHeight(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetHeight";
    marshal::BeginCall();
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetHeight(a_frame);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRComposedFrameGetLineCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetLineCount";
    marshal::BeginCall();
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetLineCount(a_frame);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedFrameGetLine(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetLine";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetLine(a_frame, a_index);
    marshal::RethrowCallbackError(rt);
    return marshal::FromHandle<TRComposedLineRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRComposedFrameGetLineIndexForCodeUnit(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetLineIndexForCodeUnit";
    marshal::BeginCall();
    TRUInteger a_codeUnitIndex = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "codeUnitIndex");
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetLineIndexForCodeUnit(a_frame, a_codeUnitIndex);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedFrameGetLineIndexAtPosition(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetLineIndexAtPosition";
    marshal::BeginCall();
    TRPoint a_position = TRPointFromJs(rt, marshal::ArgAt(args, count, 1), kFunction, "position");
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetLineIndexAtPosition(a_frame, a_position);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedFrameGetClusterStartAtPosition(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameGetClusterStartAtPosition";
    marshal::BeginCall();
    TRPoint a_position = TRPointFromJs(rt, marshal::ArgAt(args, count, 1), kFunction, "position");
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameGetClusterStartAtPosition(a_frame, a_position);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRComposedFrameEnumerateSelection(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameEnumerateSelection";
    marshal::BeginCall();
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRUInteger a_length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "length");
    marshal::Collector collector(rt);
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameEnumerateSelection(a_frame, a_index, a_length, CollectTRComposedFrameEnumerateSelection_func, &collector);
    marshal::RethrowCallbackError(rt);
    jsi::Value items = collector.Finish();
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return items;
}

jsi::Value BindTRComposedFrameDraw(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameDraw";
    marshal::BeginCall();
    TRPoint a_origin = TRPointFromJs(rt, marshal::ArgAt(args, count, 2), kFunction, "origin");
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", true);

    TRComposedFrameDraw(a_frame, a_renderer, a_origin);
    marshal::RethrowCallbackError(rt);
    return jsi::Value::undefined();
}

jsi::Value BindTRComposedFrameRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRComposedFrameRetain";
    marshal::BeginCall();
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);

    auto result = TRComposedFrameRetain(a_frame);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRComposedFrameRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRComposedFrame(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRComposedFrameGetStartIndex", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetStartIndex"), 1, &BindTRComposedFrameGetStartIndex));
    target.setProperty(rt, "TRComposedFrameGetEndIndex", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetEndIndex"), 1, &BindTRComposedFrameGetEndIndex));
    target.setProperty(rt, "TRComposedFrameGetWidth", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetWidth"), 1, &BindTRComposedFrameGetWidth));
    target.setProperty(rt, "TRComposedFrameGetHeight", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetHeight"), 1, &BindTRComposedFrameGetHeight));
    target.setProperty(rt, "TRComposedFrameGetLineCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetLineCount"), 1, &BindTRComposedFrameGetLineCount));
    target.setProperty(rt, "TRComposedFrameGetLine", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetLine"), 2, &BindTRComposedFrameGetLine));
    target.setProperty(rt, "TRComposedFrameGetLineIndexForCodeUnit", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetLineIndexForCodeUnit"), 2, &BindTRComposedFrameGetLineIndexForCodeUnit));
    target.setProperty(rt, "TRComposedFrameGetLineIndexAtPosition", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetLineIndexAtPosition"), 2, &BindTRComposedFrameGetLineIndexAtPosition));
    target.setProperty(rt, "TRComposedFrameGetClusterStartAtPosition", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameGetClusterStartAtPosition"), 2, &BindTRComposedFrameGetClusterStartAtPosition));
    target.setProperty(rt, "TRComposedFrameEnumerateSelection", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameEnumerateSelection"), 3, &BindTRComposedFrameEnumerateSelection));
    target.setProperty(rt, "TRComposedFrameDraw", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameDraw"), 3, &BindTRComposedFrameDraw));
    target.setProperty(rt, "TRComposedFrameRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRComposedFrameRetain"), 1, &BindTRComposedFrameRetain));
}

} // namespace generated
} // namespace tehreer
