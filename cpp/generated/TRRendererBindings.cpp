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

void CollectTRRendererEnumerateGlyphPlacements_func(void *userData, TRUInteger glyphIndex, TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRBoolean *stop) {
    auto *collector = static_cast<marshal::Collector *>(userData);
    if (collector->HasFailed()) {
        *stop = TRTrue;
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
        jsi::Object object(rt);
        object.setProperty(rt, "glyphIndex", marshal::FromIndex(rt, glyphIndex));
        object.setProperty(rt, "image", marshal::FromHandle<TRGlyphImageRef>(rt, image, marshal::Ownership::Retain));
        object.setProperty(rt, "origin", TRPointToJs(rt, origin));
        object.setProperty(rt, "scaleX", marshal::FromNumber<TRFloat>(rt, scaleX));
        object.setProperty(rt, "scaleY", marshal::FromNumber<TRFloat>(rt, scaleY));
        jsi::Value item(std::move(object));
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();
        *stop = TRTrue;
    }
}

void CollectTRRendererEnumerateGlyphPaths_moveTo(void *userData, TRFloat x, TRFloat y, TRBoolean *stop) {
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

void CollectTRRendererEnumerateGlyphPaths_lineTo(void *userData, TRFloat x, TRFloat y, TRBoolean *stop) {
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

void CollectTRRendererEnumerateGlyphPaths_quadTo(void *userData, TRFloat controlX, TRFloat controlY, TRFloat x, TRFloat y, TRBoolean *stop) {
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

void CollectTRRendererEnumerateGlyphPaths_cubicTo(void *userData, TRFloat control1X, TRFloat control1Y, TRFloat control2X, TRFloat control2Y, TRFloat x, TRFloat y, TRBoolean *stop) {
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

void CollectTRRendererEnumerateGlyphPaths_close(void *userData, TRBoolean *stop) {
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

jsi::Value BindTRRendererCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererCreate";

    auto result = TRRendererCreate();
    return marshal::FromHandle<TRRendererRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRRendererGetGlyphCache(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetGlyphCache";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetGlyphCache(a_renderer);
    return marshal::FromHandle<TRGlyphCacheRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRRendererSetGlyphCache(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetGlyphCache";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
    TRGlyphCacheRef a_cache = marshal::ToHandle<TRGlyphCacheRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "cache", true);

    TRRendererSetGlyphCache(a_renderer, a_cache);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetTypeface";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetTypeface(a_renderer);
    return marshal::FromHandle<TRTypefaceRef>(rt, result, marshal::Ownership::Retain);
}

jsi::Value BindTRRendererSetTypeface(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetTypeface";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
    TRTypefaceRef a_typeface = marshal::ToHandle<TRTypefaceRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "typeface", true);

    TRRendererSetTypeface(a_renderer, a_typeface);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetTypeSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetTypeSize";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetTypeSize(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetTypeSize(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetTypeSize";
    TRFloat a_typeSize = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "typeSize");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetTypeSize(a_renderer, a_typeSize);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetScaleX(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetScaleX";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetScaleX(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetScaleX(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetScaleX";
    TRFloat a_scaleX = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "scaleX");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetScaleX(a_renderer, a_scaleX);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetScaleY(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetScaleY";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetScaleY(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetScaleY(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetScaleY";
    TRFloat a_scaleY = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "scaleY");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetScaleY(a_renderer, a_scaleY);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetSkewX(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetSkewX";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetSkewX(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetSkewX(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetSkewX";
    TRFloat a_skewX = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "skewX");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetSkewX(a_renderer, a_skewX);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetRenderScale(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetRenderScale";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetRenderScale(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetRenderScale(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetRenderScale";
    TRFloat a_renderScale = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderScale");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetRenderScale(a_renderer, a_renderScale);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetWritingDirection(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetWritingDirection";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetWritingDirection(a_renderer);
    return marshal::FromNumber<TRWritingDirection>(rt, result);
}

jsi::Value BindTRRendererSetWritingDirection(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetWritingDirection";
    TRWritingDirection a_writingDirection = marshal::ToNumber<TRWritingDirection>(rt, marshal::ArgAt(args, count, 1), kFunction, "writingDirection");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetWritingDirection(a_renderer, a_writingDirection);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetForegroundColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetForegroundColor";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetForegroundColor(a_renderer);
    return marshal::FromNumber<TRColor>(rt, result);
}

jsi::Value BindTRRendererSetForegroundColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetForegroundColor";
    TRColor a_foregroundColor = marshal::ToNumber<TRColor>(rt, marshal::ArgAt(args, count, 1), kFunction, "foregroundColor");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetForegroundColor(a_renderer, a_foregroundColor);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetStrokeRadius(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetStrokeRadius";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetStrokeRadius(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetStrokeRadius(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetStrokeRadius";
    TRFloat a_strokeRadius = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "strokeRadius");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetStrokeRadius(a_renderer, a_strokeRadius);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetStrokeCap(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetStrokeCap";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetStrokeCap(a_renderer);
    return marshal::FromNumber<TRStrokeCap>(rt, result);
}

jsi::Value BindTRRendererSetStrokeCap(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetStrokeCap";
    TRStrokeCap a_strokeCap = marshal::ToNumber<TRStrokeCap>(rt, marshal::ArgAt(args, count, 1), kFunction, "strokeCap");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetStrokeCap(a_renderer, a_strokeCap);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetStrokeJoin(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetStrokeJoin";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetStrokeJoin(a_renderer);
    return marshal::FromNumber<TRStrokeJoin>(rt, result);
}

jsi::Value BindTRRendererSetStrokeJoin(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetStrokeJoin";
    TRStrokeJoin a_strokeJoin = marshal::ToNumber<TRStrokeJoin>(rt, marshal::ArgAt(args, count, 1), kFunction, "strokeJoin");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetStrokeJoin(a_renderer, a_strokeJoin);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetStrokeMiter(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetStrokeMiter";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetStrokeMiter(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetStrokeMiter(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetStrokeMiter";
    TRFloat a_strokeMiter = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "strokeMiter");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetStrokeMiter(a_renderer, a_strokeMiter);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetStrokeColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetStrokeColor";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetStrokeColor(a_renderer);
    return marshal::FromNumber<TRColor>(rt, result);
}

jsi::Value BindTRRendererSetStrokeColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetStrokeColor";
    TRColor a_strokeColor = marshal::ToNumber<TRColor>(rt, marshal::ArgAt(args, count, 1), kFunction, "strokeColor");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetStrokeColor(a_renderer, a_strokeColor);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetShadowRadius(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetShadowRadius";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetShadowRadius(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetShadowRadius(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetShadowRadius";
    TRFloat a_shadowRadius = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "shadowRadius");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetShadowRadius(a_renderer, a_shadowRadius);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetShadowDx(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetShadowDx";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetShadowDx(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetShadowDx(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetShadowDx";
    TRFloat a_shadowDx = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "shadowDx");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetShadowDx(a_renderer, a_shadowDx);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetShadowDy(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetShadowDy";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetShadowDy(a_renderer);
    return marshal::FromNumber<TRFloat>(rt, result);
}

jsi::Value BindTRRendererSetShadowDy(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetShadowDy";
    TRFloat a_shadowDy = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "shadowDy");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetShadowDy(a_renderer, a_shadowDy);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetShadowColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetShadowColor";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetShadowColor(a_renderer);
    return marshal::FromNumber<TRColor>(rt, result);
}

jsi::Value BindTRRendererSetShadowColor(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetShadowColor";
    TRColor a_shadowColor = marshal::ToNumber<TRColor>(rt, marshal::ArgAt(args, count, 1), kFunction, "shadowColor");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetShadowColor(a_renderer, a_shadowColor);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererGetDrawStyle(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererGetDrawStyle";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererGetDrawStyle(a_renderer);
    return marshal::FromNumber<TRDrawStyle>(rt, result);
}

jsi::Value BindTRRendererSetDrawStyle(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererSetDrawStyle";
    TRDrawStyle a_drawStyle = marshal::ToNumber<TRDrawStyle>(rt, marshal::ArgAt(args, count, 1), kFunction, "drawStyle");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    TRRendererSetDrawStyle(a_renderer, a_drawStyle);
    return jsi::Value::undefined();
}

jsi::Value BindTRRendererIsRenderable(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererIsRenderable";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererIsRenderable(a_renderer);
    return marshal::FromBoolean(result != 0);
}

jsi::Value BindTRRendererCreateGlyphImage(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererCreateGlyphImage";
    TRGlyphID a_glyphID = marshal::ToNumber<TRGlyphID>(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphID");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererCreateGlyphImage(a_renderer, a_glyphID);
    return marshal::FromHandle<TRGlyphImageRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRRendererCreateStrokeImage(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererCreateStrokeImage";
    TRGlyphID a_glyphID = marshal::ToNumber<TRGlyphID>(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphID");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererCreateStrokeImage(a_renderer, a_glyphID);
    return marshal::FromHandle<TRGlyphImageRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRRendererCreateGlyphPath(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererCreateGlyphPath";
    TRGlyphID a_glyphID = marshal::ToNumber<TRGlyphID>(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphID");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererCreateGlyphPath(a_renderer, a_glyphID);
    return marshal::FromHandle<TRPathRef>(rt, result, marshal::Ownership::Adopt);
}

jsi::Value BindTRRendererComputeGlyphInkBox(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererComputeGlyphInkBox";
    TRGlyphID a_glyphID = marshal::ToNumber<TRGlyphID>(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphID");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererComputeGlyphInkBox(a_renderer, a_glyphID);
    return TRRectToJs(rt, result);
}

jsi::Value BindTRRendererComputeRunInkBox(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererComputeRunInkBox";
    std::vector<TRPoint> v_offsets;
    size_t n_offsets = 0;
    const TRPoint *a_offsets = nullptr;
    {
        jsi::Array array = marshal::ToArray(rt, marshal::ArgAt(args, count, 2), kFunction, "offsets");
        n_offsets = array.size(rt);
        v_offsets.reserve(n_offsets);
        for (size_t index = 0; index < n_offsets; index++) {
            v_offsets.push_back(TRPointFromJs(rt, array.getValueAtIndex(rt, index), kFunction, "offsets"));
        }
        a_offsets = v_offsets.data();
    }
    TRUInteger a_count = marshal::ToIndex(rt, marshal::ArgAt(args, count, 4), kFunction, "count");
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
    marshal::ConstBuffer a_glyphIDs = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphIDs", false);
    marshal::ConstBuffer a_advances = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 3), kFunction, "advances", false);

    marshal::RequireCapacity(rt, kFunction, "glyphIDs", static_cast<size_t>(a_count), sizeof(TRGlyphID), a_glyphIDs.byteLength);
    marshal::RequireElements(rt, kFunction, "offsets", static_cast<size_t>(a_count), n_offsets);
    marshal::RequireCapacity(rt, kFunction, "advances", static_cast<size_t>(a_count), sizeof(TRFloat), a_advances.byteLength);

    auto result = TRRendererComputeRunInkBox(a_renderer, static_cast<const TRGlyphID *>(a_glyphIDs.data), a_offsets, static_cast<const TRFloat *>(a_advances.data), a_count);
    return TRRectToJs(rt, result);
}

jsi::Value BindTRRendererEnumerateGlyphPlacements(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererEnumerateGlyphPlacements";
    TRGlyphImageKind a_kind = marshal::ToNumber<TRGlyphImageKind>(rt, marshal::ArgAt(args, count, 1), kFunction, "kind");
    std::vector<TRPoint> v_offsets;
    size_t n_offsets = 0;
    const TRPoint *a_offsets = nullptr;
    {
        jsi::Array array = marshal::ToArray(rt, marshal::ArgAt(args, count, 3), kFunction, "offsets");
        n_offsets = array.size(rt);
        v_offsets.reserve(n_offsets);
        for (size_t index = 0; index < n_offsets; index++) {
            v_offsets.push_back(TRPointFromJs(rt, array.getValueAtIndex(rt, index), kFunction, "offsets"));
        }
        a_offsets = v_offsets.data();
    }
    TRUInteger a_count = marshal::ToIndex(rt, marshal::ArgAt(args, count, 5), kFunction, "count");
    marshal::Collector collector(rt);
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
    marshal::ConstBuffer a_glyphIDs = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 2), kFunction, "glyphIDs", false);
    marshal::ConstBuffer a_advances = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 4), kFunction, "advances", false);

    marshal::RequireCapacity(rt, kFunction, "glyphIDs", static_cast<size_t>(a_count), sizeof(TRGlyphID), a_glyphIDs.byteLength);
    marshal::RequireElements(rt, kFunction, "offsets", static_cast<size_t>(a_count), n_offsets);
    marshal::RequireCapacity(rt, kFunction, "advances", static_cast<size_t>(a_count), sizeof(TRFloat), a_advances.byteLength);

    TRRendererEnumerateGlyphPlacements(a_renderer, a_kind, static_cast<const TRGlyphID *>(a_glyphIDs.data), a_offsets, static_cast<const TRFloat *>(a_advances.data), a_count, CollectTRRendererEnumerateGlyphPlacements_func, &collector);
    jsi::Value items = collector.Finish();
    return items;
}

jsi::Value BindTRRendererEnumerateGlyphPaths(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererEnumerateGlyphPaths";
    std::vector<TRPoint> v_offsets;
    size_t n_offsets = 0;
    const TRPoint *a_offsets = nullptr;
    {
        jsi::Array array = marshal::ToArray(rt, marshal::ArgAt(args, count, 2), kFunction, "offsets");
        n_offsets = array.size(rt);
        v_offsets.reserve(n_offsets);
        for (size_t index = 0; index < n_offsets; index++) {
            v_offsets.push_back(TRPointFromJs(rt, array.getValueAtIndex(rt, index), kFunction, "offsets"));
        }
        a_offsets = v_offsets.data();
    }
    TRUInteger a_count = marshal::ToIndex(rt, marshal::ArgAt(args, count, 4), kFunction, "count");
    marshal::Collector collector(rt);
    TRPathCallbacks callbacks = {};
    callbacks.moveTo = CollectTRRendererEnumerateGlyphPaths_moveTo;
    callbacks.lineTo = CollectTRRendererEnumerateGlyphPaths_lineTo;
    callbacks.quadTo = CollectTRRendererEnumerateGlyphPaths_quadTo;
    callbacks.cubicTo = CollectTRRendererEnumerateGlyphPaths_cubicTo;
    callbacks.close = CollectTRRendererEnumerateGlyphPaths_close;
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
    marshal::ConstBuffer a_glyphIDs = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 1), kFunction, "glyphIDs", false);
    marshal::ConstBuffer a_advances = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 3), kFunction, "advances", false);

    marshal::RequireCapacity(rt, kFunction, "glyphIDs", static_cast<size_t>(a_count), sizeof(TRGlyphID), a_glyphIDs.byteLength);
    marshal::RequireElements(rt, kFunction, "offsets", static_cast<size_t>(a_count), n_offsets);
    marshal::RequireCapacity(rt, kFunction, "advances", static_cast<size_t>(a_count), sizeof(TRFloat), a_advances.byteLength);

    TRRendererEnumerateGlyphPaths(a_renderer, static_cast<const TRGlyphID *>(a_glyphIDs.data), a_offsets, static_cast<const TRFloat *>(a_advances.data), a_count, &callbacks, &collector);
    jsi::Value items = collector.Finish();
    return items;
}

jsi::Value BindTRRendererRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRRendererRetain";
    TRRendererRef a_renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);

    auto result = TRRendererRetain(a_renderer);
    return marshal::FromHandle<TRRendererRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRRenderer(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRRendererCreate", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererCreate"), 0, &BindTRRendererCreate));
    target.setProperty(rt, "TRRendererGetGlyphCache", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetGlyphCache"), 1, &BindTRRendererGetGlyphCache));
    target.setProperty(rt, "TRRendererSetGlyphCache", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetGlyphCache"), 2, &BindTRRendererSetGlyphCache));
    target.setProperty(rt, "TRRendererGetTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetTypeface"), 1, &BindTRRendererGetTypeface));
    target.setProperty(rt, "TRRendererSetTypeface", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetTypeface"), 2, &BindTRRendererSetTypeface));
    target.setProperty(rt, "TRRendererGetTypeSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetTypeSize"), 1, &BindTRRendererGetTypeSize));
    target.setProperty(rt, "TRRendererSetTypeSize", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetTypeSize"), 2, &BindTRRendererSetTypeSize));
    target.setProperty(rt, "TRRendererGetScaleX", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetScaleX"), 1, &BindTRRendererGetScaleX));
    target.setProperty(rt, "TRRendererSetScaleX", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetScaleX"), 2, &BindTRRendererSetScaleX));
    target.setProperty(rt, "TRRendererGetScaleY", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetScaleY"), 1, &BindTRRendererGetScaleY));
    target.setProperty(rt, "TRRendererSetScaleY", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetScaleY"), 2, &BindTRRendererSetScaleY));
    target.setProperty(rt, "TRRendererGetSkewX", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetSkewX"), 1, &BindTRRendererGetSkewX));
    target.setProperty(rt, "TRRendererSetSkewX", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetSkewX"), 2, &BindTRRendererSetSkewX));
    target.setProperty(rt, "TRRendererGetRenderScale", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetRenderScale"), 1, &BindTRRendererGetRenderScale));
    target.setProperty(rt, "TRRendererSetRenderScale", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetRenderScale"), 2, &BindTRRendererSetRenderScale));
    target.setProperty(rt, "TRRendererGetWritingDirection", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetWritingDirection"), 1, &BindTRRendererGetWritingDirection));
    target.setProperty(rt, "TRRendererSetWritingDirection", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetWritingDirection"), 2, &BindTRRendererSetWritingDirection));
    target.setProperty(rt, "TRRendererGetForegroundColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetForegroundColor"), 1, &BindTRRendererGetForegroundColor));
    target.setProperty(rt, "TRRendererSetForegroundColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetForegroundColor"), 2, &BindTRRendererSetForegroundColor));
    target.setProperty(rt, "TRRendererGetStrokeRadius", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetStrokeRadius"), 1, &BindTRRendererGetStrokeRadius));
    target.setProperty(rt, "TRRendererSetStrokeRadius", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetStrokeRadius"), 2, &BindTRRendererSetStrokeRadius));
    target.setProperty(rt, "TRRendererGetStrokeCap", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetStrokeCap"), 1, &BindTRRendererGetStrokeCap));
    target.setProperty(rt, "TRRendererSetStrokeCap", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetStrokeCap"), 2, &BindTRRendererSetStrokeCap));
    target.setProperty(rt, "TRRendererGetStrokeJoin", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetStrokeJoin"), 1, &BindTRRendererGetStrokeJoin));
    target.setProperty(rt, "TRRendererSetStrokeJoin", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetStrokeJoin"), 2, &BindTRRendererSetStrokeJoin));
    target.setProperty(rt, "TRRendererGetStrokeMiter", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetStrokeMiter"), 1, &BindTRRendererGetStrokeMiter));
    target.setProperty(rt, "TRRendererSetStrokeMiter", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetStrokeMiter"), 2, &BindTRRendererSetStrokeMiter));
    target.setProperty(rt, "TRRendererGetStrokeColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetStrokeColor"), 1, &BindTRRendererGetStrokeColor));
    target.setProperty(rt, "TRRendererSetStrokeColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetStrokeColor"), 2, &BindTRRendererSetStrokeColor));
    target.setProperty(rt, "TRRendererGetShadowRadius", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetShadowRadius"), 1, &BindTRRendererGetShadowRadius));
    target.setProperty(rt, "TRRendererSetShadowRadius", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetShadowRadius"), 2, &BindTRRendererSetShadowRadius));
    target.setProperty(rt, "TRRendererGetShadowDx", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetShadowDx"), 1, &BindTRRendererGetShadowDx));
    target.setProperty(rt, "TRRendererSetShadowDx", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetShadowDx"), 2, &BindTRRendererSetShadowDx));
    target.setProperty(rt, "TRRendererGetShadowDy", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetShadowDy"), 1, &BindTRRendererGetShadowDy));
    target.setProperty(rt, "TRRendererSetShadowDy", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetShadowDy"), 2, &BindTRRendererSetShadowDy));
    target.setProperty(rt, "TRRendererGetShadowColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetShadowColor"), 1, &BindTRRendererGetShadowColor));
    target.setProperty(rt, "TRRendererSetShadowColor", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetShadowColor"), 2, &BindTRRendererSetShadowColor));
    target.setProperty(rt, "TRRendererGetDrawStyle", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererGetDrawStyle"), 1, &BindTRRendererGetDrawStyle));
    target.setProperty(rt, "TRRendererSetDrawStyle", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererSetDrawStyle"), 2, &BindTRRendererSetDrawStyle));
    target.setProperty(rt, "TRRendererIsRenderable", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererIsRenderable"), 1, &BindTRRendererIsRenderable));
    target.setProperty(rt, "TRRendererCreateGlyphImage", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererCreateGlyphImage"), 2, &BindTRRendererCreateGlyphImage));
    target.setProperty(rt, "TRRendererCreateStrokeImage", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererCreateStrokeImage"), 2, &BindTRRendererCreateStrokeImage));
    target.setProperty(rt, "TRRendererCreateGlyphPath", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererCreateGlyphPath"), 2, &BindTRRendererCreateGlyphPath));
    target.setProperty(rt, "TRRendererComputeGlyphInkBox", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererComputeGlyphInkBox"), 2, &BindTRRendererComputeGlyphInkBox));
    target.setProperty(rt, "TRRendererComputeRunInkBox", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererComputeRunInkBox"), 5, &BindTRRendererComputeRunInkBox));
    target.setProperty(rt, "TRRendererEnumerateGlyphPlacements", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererEnumerateGlyphPlacements"), 6, &BindTRRendererEnumerateGlyphPlacements));
    target.setProperty(rt, "TRRendererEnumerateGlyphPaths", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererEnumerateGlyphPaths"), 5, &BindTRRendererEnumerateGlyphPaths));
    target.setProperty(rt, "TRRendererRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRRendererRetain"), 1, &BindTRRendererRetain));
}

} // namespace generated
} // namespace tehreer
