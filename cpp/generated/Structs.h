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

#ifndef TEHREER_GENERATED_STRUCTS_H
#define TEHREER_GENERATED_STRUCTS_H

#include "GeneratedSupport.h"

namespace tehreer {
namespace generated {

inline jsi::Value TRPointToJs(jsi::Runtime &rt, const TRPoint &value) {
    jsi::Object object(rt);
    object.setProperty(rt, "x", marshal::FromNumber<TRFloat>(rt, value.x));
    object.setProperty(rt, "y", marshal::FromNumber<TRFloat>(rt, value.y));
    return jsi::Value(std::move(object));
}

inline TRPoint TRPointFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter.c_str());
    TRPoint result = {};
    result.x = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "x"), function, (parameter + ".x").c_str());
    result.y = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "y"), function, (parameter + ".y").c_str());
    return result;
}

inline jsi::Value TRSizeToJs(jsi::Runtime &rt, const TRSize &value) {
    jsi::Object object(rt);
    object.setProperty(rt, "width", marshal::FromNumber<TRFloat>(rt, value.width));
    object.setProperty(rt, "height", marshal::FromNumber<TRFloat>(rt, value.height));
    return jsi::Value(std::move(object));
}

inline TRSize TRSizeFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter.c_str());
    TRSize result = {};
    result.width = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "width"), function, (parameter + ".width").c_str());
    result.height = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "height"), function, (parameter + ".height").c_str());
    return result;
}

inline jsi::Value TRRectToJs(jsi::Runtime &rt, const TRRect &value) {
    jsi::Object object(rt);
    object.setProperty(rt, "origin", TRPointToJs(rt, value.origin));
    object.setProperty(rt, "size", TRSizeToJs(rt, value.size));
    return jsi::Value(std::move(object));
}

inline TRRect TRRectFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter.c_str());
    TRRect result = {};
    result.origin = TRPointFromJs(rt, object.getProperty(rt, "origin"), function, parameter + ".origin");
    result.size = TRSizeFromJs(rt, object.getProperty(rt, "size"), function, parameter + ".size");
    return result;
}

inline jsi::Value TROpenTypeFeatureToJs(jsi::Runtime &rt, const TROpenTypeFeature &value) {
    jsi::Object object(rt);
    object.setProperty(rt, "tag", marshal::FromNumber<TRTag>(rt, value.tag));
    object.setProperty(rt, "value", marshal::FromNumber<TRUInt32>(rt, value.value));
    return jsi::Value(std::move(object));
}

inline TROpenTypeFeature TROpenTypeFeatureFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter.c_str());
    TROpenTypeFeature result = {};
    result.tag = marshal::ToNumber<TRTag>(rt, object.getProperty(rt, "tag"), function, (parameter + ".tag").c_str());
    result.value = marshal::ToNumber<TRUInt32>(rt, object.getProperty(rt, "value"), function, (parameter + ".value").c_str());
    return result;
}

inline jsi::Value TRAffineTransformToJs(jsi::Runtime &rt, const TRAffineTransform &value) {
    jsi::Object object(rt);
    object.setProperty(rt, "a", marshal::FromNumber<TRFloat>(rt, value.a));
    object.setProperty(rt, "b", marshal::FromNumber<TRFloat>(rt, value.b));
    object.setProperty(rt, "c", marshal::FromNumber<TRFloat>(rt, value.c));
    object.setProperty(rt, "d", marshal::FromNumber<TRFloat>(rt, value.d));
    object.setProperty(rt, "tx", marshal::FromNumber<TRFloat>(rt, value.tx));
    object.setProperty(rt, "ty", marshal::FromNumber<TRFloat>(rt, value.ty));
    return jsi::Value(std::move(object));
}

inline TRAffineTransform TRAffineTransformFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter.c_str());
    TRAffineTransform result = {};
    result.a = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "a"), function, (parameter + ".a").c_str());
    result.b = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "b"), function, (parameter + ".b").c_str());
    result.c = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "c"), function, (parameter + ".c").c_str());
    result.d = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "d"), function, (parameter + ".d").c_str());
    result.tx = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "tx"), function, (parameter + ".tx").c_str());
    result.ty = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "ty"), function, (parameter + ".ty").c_str());
    return result;
}

inline jsi::Value TRReplacementRoomToJs(jsi::Runtime &rt, const TRReplacementRoom &value) {
    jsi::Object object(rt);
    object.setProperty(rt, "ascent", marshal::FromNumber<TRFloat>(rt, value.ascent));
    object.setProperty(rt, "descent", marshal::FromNumber<TRFloat>(rt, value.descent));
    object.setProperty(rt, "extent", marshal::FromNumber<TRFloat>(rt, value.extent));
    return jsi::Value(std::move(object));
}

inline TRReplacementRoom TRReplacementRoomFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter.c_str());
    TRReplacementRoom result = {};
    result.ascent = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "ascent"), function, (parameter + ".ascent").c_str());
    result.descent = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "descent"), function, (parameter + ".descent").c_str());
    result.extent = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "extent"), function, (parameter + ".extent").c_str());
    return result;
}

} // namespace generated
} // namespace tehreer

#endif
