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

void CollectTRPathEnumerate_moveTo(void *userData, TRFloat x, TRFloat y, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "type", jsi::String::createFromAscii(rt, "moveTo"));
        object.setProperty(rt, "x", marshal::FromNumber<TRFloat>(rt, x));
        object.setProperty(rt, "y", marshal::FromNumber<TRFloat>(rt, y));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

void CollectTRPathEnumerate_lineTo(void *userData, TRFloat x, TRFloat y, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "type", jsi::String::createFromAscii(rt, "lineTo"));
        object.setProperty(rt, "x", marshal::FromNumber<TRFloat>(rt, x));
        object.setProperty(rt, "y", marshal::FromNumber<TRFloat>(rt, y));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

void CollectTRPathEnumerate_quadTo(void *userData, TRFloat controlX, TRFloat controlY, TRFloat x, TRFloat y, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "type", jsi::String::createFromAscii(rt, "quadTo"));
        object.setProperty(rt, "controlX", marshal::FromNumber<TRFloat>(rt, controlX));
        object.setProperty(rt, "controlY", marshal::FromNumber<TRFloat>(rt, controlY));
        object.setProperty(rt, "x", marshal::FromNumber<TRFloat>(rt, x));
        object.setProperty(rt, "y", marshal::FromNumber<TRFloat>(rt, y));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

void CollectTRPathEnumerate_cubicTo(void *userData, TRFloat control1X, TRFloat control1Y, TRFloat control2X, TRFloat control2Y, TRFloat x, TRFloat y, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "type", jsi::String::createFromAscii(rt, "cubicTo"));
        object.setProperty(rt, "control1X", marshal::FromNumber<TRFloat>(rt, control1X));
        object.setProperty(rt, "control1Y", marshal::FromNumber<TRFloat>(rt, control1Y));
        object.setProperty(rt, "control2X", marshal::FromNumber<TRFloat>(rt, control2X));
        object.setProperty(rt, "control2Y", marshal::FromNumber<TRFloat>(rt, control2Y));
        object.setProperty(rt, "x", marshal::FromNumber<TRFloat>(rt, x));
        object.setProperty(rt, "y", marshal::FromNumber<TRFloat>(rt, y));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

void CollectTRPathEnumerate_close(void *userData, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "type", jsi::String::createFromAscii(rt, "close"));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

jsi::Value BindTRPathEnumerate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRPathEnumerate";
    TRPathRef a_path = marshal::ToHandle<TRPathRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "path", false);
    TRAffineTransform v_transform = {};
    const TRAffineTransform *a_transform = nullptr;
    if (!marshal::IsNullish(marshal::ArgAt(args, count, 1))) {
        v_transform = TRAffineTransformFromJs(rt, marshal::ArgAt(args, count, 1), kFunction, "transform");
        a_transform = &v_transform;
    }
    marshal::Collector collector(rt);
    TRPathCallbacks callbacks = {};
    callbacks.moveTo = CollectTRPathEnumerate_moveTo;
    callbacks.lineTo = CollectTRPathEnumerate_lineTo;
    callbacks.quadTo = CollectTRPathEnumerate_quadTo;
    callbacks.cubicTo = CollectTRPathEnumerate_cubicTo;
    callbacks.close = CollectTRPathEnumerate_close;

    auto result = TRPathEnumerate(a_path, a_transform, &callbacks, &collector);
    jsi::Value items = collector.Finish();
    if (result == TRFalse) {
        return jsi::Value::undefined();
    }
    return items;
}

jsi::Value BindTRPathRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRPathRetain";
    TRPathRef a_path = marshal::ToHandle<TRPathRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "path", false);

    auto result = TRPathRetain(a_path);
    return marshal::FromHandle<TRPathRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRPath(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRPathEnumerate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRPathEnumerate"), 2, &BindTRPathEnumerate));
    target.setProperty(rt, "TRPathRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRPathRetain"), 1, &BindTRPathRetain));
}

} // namespace generated
} // namespace tehreer
