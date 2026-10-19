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

jsi::Value BindTRAttributeListGetItem(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRAttributeListGetItem";
    TRUInteger a_index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "index");
    TRAttributeListRef a_list = marshal::ToHandle<TRAttributeListRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "list", false);

    auto result = TRAttributeListGetItem(a_list, a_index);
    marshal::RethrowCallbackError(rt);
    return marshal::MakePointerView(rt, result, "TRAttribute", sizeof(TRAttribute), marshal::ArgAt(args, count, 0));
}

jsi::Value BindTRAttributeListGetCount(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRAttributeListGetCount";
    TRAttributeListRef a_list = marshal::ToHandle<TRAttributeListRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "list", false);

    auto result = TRAttributeListGetCount(a_list);
    marshal::RethrowCallbackError(rt);
    return marshal::FromIndex(rt, result);
}

jsi::Value BindTRAttributeListRetain(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    [[maybe_unused]] constexpr const char *kFunction = "TRAttributeListRetain";
    TRAttributeListRef a_list = marshal::ToHandle<TRAttributeListRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "list", false);

    auto result = TRAttributeListRetain(a_list);
    marshal::RethrowCallbackError(rt, result);
    return marshal::FromHandle<TRAttributeListRef>(rt, result, marshal::Ownership::Adopt);
}

} // namespace

void InstallTRAttributeList(jsi::Runtime &rt, jsi::Object &target) {
    target.setProperty(rt, "TRAttributeListGetItem", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRAttributeListGetItem"), 2, &BindTRAttributeListGetItem));
    target.setProperty(rt, "TRAttributeListGetCount", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRAttributeListGetCount"), 1, &BindTRAttributeListGetCount));
    target.setProperty(rt, "TRAttributeListRetain", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "TRAttributeListRetain"), 1, &BindTRAttributeListRetain));
}

} // namespace generated
} // namespace tehreer
