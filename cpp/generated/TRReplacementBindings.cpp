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

jsi::Value BindTRReplacementGetKind(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRReplacementGetKind";
    TRReplacementRef a_replacement = marshal::ToHandle<TRReplacementRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "replacement", false);

    auto result = TRReplacementGetKind(a_replacement);
    marshal::RethrowCallbackError(rt);
    return marshal::FromNumber<TRReplacementKind>(rt, result);
}

jsi::Value BindTRReplacementComputeRoom(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRReplacementComputeRoom";
    TRFloat a_layoutWidth = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "layoutWidth");
    TRReplacementRoom o_room = {};
    TRReplacementRef a_replacement = marshal::ToHandle<TRReplacementRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "replacement", false);

    TRReplacementComputeRoom(a_replacement, a_layoutWidth, &o_room);
    marshal::RethrowCallbackError(rt);
    return TRReplacementRoomToJs(rt, o_room);
}

jsi::Value BindTRReplacementRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRReplacementRetain";
    TRReplacementRef a_replacement = marshal::ToHandle<TRReplacementRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "replacement", false);

    auto result = TRReplacementRetain(a_replacement);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRReplacementRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRReplacement(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRReplacementGetKind", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRReplacementGetKind"), 1, &BindTRReplacementGetKind));
    target.setProperty(rt, "TRReplacementComputeRoom", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRReplacementComputeRoom"), 2, &BindTRReplacementComputeRoom));
    target.setProperty(rt, "TRReplacementRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRReplacementRetain"), 1, &BindTRReplacementRetain));
}

} // namespace generated
} // namespace tehreer
