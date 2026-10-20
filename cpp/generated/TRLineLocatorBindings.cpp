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

void CollectTRLineLocatorEnumerateLines_func(void *userData, TRUInteger lineIndex, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Value item = marshal::FromIndex(rt, lineIndex);
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

jsi::Value BindTRLineLocatorCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRLineLocatorCreate";
    marshal::BeginCall();
    TRComposedFrameRef a_frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", false);

    auto result = TRLineLocatorCreate(a_frame, a_renderer);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRLineLocatorRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRLineLocatorGetLineCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRLineLocatorGetLineCount";
    marshal::BeginCall();
    TRLineLocatorRef a_locator = marshal::ToHandle<TRLineLocatorRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "locator", false);

    auto result = TRLineLocatorGetLineCount(a_locator);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRLineLocatorGetLineBox(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRLineLocatorGetLineBox";
    marshal::BeginCall();
    TRUInteger a_lineIndex = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "lineIndex");
    TRRect o_box = {};
    TRLineLocatorRef a_locator = marshal::ToHandle<TRLineLocatorRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "locator", false);

    auto result = TRLineLocatorGetLineBox(a_locator, a_lineIndex, &o_box);
    marshal::RethrowCallbackError(rt);
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return TRRectToJs(rt, o_box);
}

jsi::Value BindTRLineLocatorEnumerateLines(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRLineLocatorEnumerateLines";
    marshal::BeginCall();
    TRRect a_rect = TRRectFromJs(rt, marshal::ArgAt(args, count, 1), kFunction, "rect");
    marshal::Collector collector(rt);
    TRLineLocatorRef a_locator = marshal::ToHandle<TRLineLocatorRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "locator", false);

    auto result = TRLineLocatorEnumerateLines(a_locator, a_rect, CollectTRLineLocatorEnumerateLines_func, &collector);
    marshal::RethrowCallbackError(rt);
    jsi::Value items = collector.Finish();
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return items;
}

jsi::Value BindTRLineLocatorGetFirstLineIndexBelow(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRLineLocatorGetFirstLineIndexBelow";
    marshal::BeginCall();
    TRFloat a_y = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "y");
    TRLineLocatorRef a_locator = marshal::ToHandle<TRLineLocatorRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "locator", false);

    auto result = TRLineLocatorGetFirstLineIndexBelow(a_locator, a_y);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRLineLocatorRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRLineLocatorRetain";
    marshal::BeginCall();
    TRLineLocatorRef a_locator = marshal::ToHandle<TRLineLocatorRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "locator", false);

    auto result = TRLineLocatorRetain(a_locator);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRLineLocatorRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRLineLocator(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRLineLocatorCreate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRLineLocatorCreate"), 2, &BindTRLineLocatorCreate));
    target.setProperty(rt, "TRLineLocatorGetLineCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRLineLocatorGetLineCount"), 1, &BindTRLineLocatorGetLineCount));
    target.setProperty(rt, "TRLineLocatorGetLineBox", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRLineLocatorGetLineBox"), 2, &BindTRLineLocatorGetLineBox));
    target.setProperty(rt, "TRLineLocatorEnumerateLines", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRLineLocatorEnumerateLines"), 2, &BindTRLineLocatorEnumerateLines));
    target.setProperty(rt, "TRLineLocatorGetFirstLineIndexBelow", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRLineLocatorGetFirstLineIndexBelow"), 2, &BindTRLineLocatorGetFirstLineIndexBelow));
    target.setProperty(rt, "TRLineLocatorRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRLineLocatorRetain"), 1, &BindTRLineLocatorRetain));
}

} // namespace generated
} // namespace tehreer
